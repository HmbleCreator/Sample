import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { Session } from '@auth0/nextjs-auth0';
import { auth0Config, getSession, refreshSession, ExtendedSession } from '@/auth0.config';
import { createClient } from '@supabase/supabase-js';
import superjson from 'superjson';
import { ZodError } from 'zod';

// Verify required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Create a base Supabase client for unauthenticated operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

// Create a new Supabase client with the user's ID token for RLS
const createSupabaseClient = async (session: ExtendedSession | null) => {
  if (!session?.idToken) {
    // Return an unauthenticated client if no session or token
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );
  }

  // Create authenticated client with the provided token
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${session.idToken}`,
        },
      },
    }
  );

  return client;
};

/**
 * Tests the Supabase connection and refreshes the session if needed
 */
async function testSupabaseConnection(client: any, session: ExtendedSession | null, req: any, res: any): Promise<{ client: any; session: ExtendedSession | null }> {
  if (!session?.idToken) {
    return { client, session };
  }

  try {
    // Test the connection with a simple query
    const { error } = await client
      .from('conversations')
      .select('*')
      .limit(1);

    if (error) {
      console.warn('Supabase connection test failed:', error);
      
      // If the error is due to an expired token, try to refresh it
      if (error.code === 'PGRST301' && session.refreshToken) {
        console.log('Token expired, attempting to refresh...');
        const newSession = await refreshSession(req, res);
        
        if (newSession?.idToken) {
          console.log('Successfully refreshed Auth0 session');
          // Create a new client with the refreshed token
          const newClient = await createSupabaseClient(newSession);
          return { client: newClient, session: newSession };
        }
      }
    } else {
      console.log('Successfully connected to Supabase with RLS');
    }
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
  }

  return { client, session };
}

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;
  
  // Get the session with our custom configuration
  let session = await getSession(req, res);
  
  // Log session information for debugging
  console.log('Session data:', JSON.stringify({
    hasSession: !!session,
    hasIdToken: !!(session?.idToken),
    hasAccessToken: !!(session?.accessToken),
    hasRefreshToken: !!(session?.refreshToken),
    user: session?.user ? {
      sub: session.user.sub,
      email: session.user.email,
      name: session.user.name,
    } : null
  }, null, 2));

    // Ensure session is properly typed and handle undefined case
  const typedSession: ExtendedSession | null = session || null;
  
  // Create a Supabase client with the current session
  let client = await createSupabaseClient(typedSession);
  
  // Test the connection and refresh the session if needed
  const connectionResult = await testSupabaseConnection(client, typedSession, req, res);
  client = connectionResult.client;
  session = connectionResult.session;

  return {
    session,
    supabase: client,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
      supabase: ctx.supabase,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
