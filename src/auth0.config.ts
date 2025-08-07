import { getSession as getAuth0Session, Session } from '@auth0/nextjs-auth0';
import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next';

// Define the shape of the user object from Auth0
type Auth0User = {
  sub: string;
  email?: string;
  name?: string;
  [key: string]: any; // Allow for additional properties
};

/**
 * Extended Session type that includes additional token information
 */
export interface ExtendedSession extends Omit<Session, 'user'> {
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: Auth0User | null;
}

/**
 * Configuration for Auth0 session and token management
 */
export const auth0Config = {
  // Session configuration
  session: {
    // Absolute lifetime of the session in seconds (7 days)
    absoluteDuration: 60 * 60 * 24 * 7,
    // Session idle timeout in seconds (1 day)
    idleTimeout: 60 * 60 * 24,
    // How often to refresh the session in seconds (1 hour)
    rollingDuration: 60 * 60,
  },
  // Auth0 configuration
  auth0: {
    // Required scopes for your application
    scope: 'openid profile email offline_access',
    // Enable refresh tokens
    useRefreshTokens: true,
    // Refresh tokens are used to fetch new tokens from the Auth0 server
    refreshInterval: 300, // 5 minutes
  },
};

/**
 * Gets the current session with extended type information
 */
export async function getSession(
  req: NextApiRequest | GetServerSidePropsContext['req'],
  res: NextApiResponse | GetServerSidePropsContext['res']
): Promise<ExtendedSession | null | undefined> {
  try {
    const session = await getAuth0Session(req, res);
    
    // Log session info for debugging (without sensitive data)
    if (session) {
      console.log('Auth0 Session:', {
        hasIdToken: !!session.idToken,
        hasAccessToken: !!session.accessToken,
        hasRefreshToken: !!session.refreshToken,
        user: session.user ? { sub: session.user.sub, email: session.user.email } : null,
      });
    }
    
    return session as ExtendedSession;
  } catch (error) {
    console.error('Error getting Auth0 session:', error);
    return null;
  }
}

/**
 * Gets the current user from the session
 */
export async function getUser(
  req: NextApiRequest | GetServerSidePropsContext['req'],
  res: NextApiResponse | GetServerSidePropsContext['res']
): Promise<ExtendedSession['user'] | null> {
  const session = await getSession(req, res);
  return session?.user || null;
}

/**
 * Refreshes the Auth0 session using the refresh token
 */
export async function refreshSession(
  req: NextApiRequest | GetServerSidePropsContext['req'],
  res: NextApiResponse | GetServerSidePropsContext['res']
): Promise<ExtendedSession | null> {
  try {
    // Get the current session
    const session = await getSession(req, res);
    
    if (!session?.refreshToken) {
      console.warn('No refresh token available in session');
      return null;
    }

    // Call the Auth0 token endpoint to refresh the token
    const tokenEndpoint = `https://${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`;
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        refresh_token: session.refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to refresh Auth0 session:', error);
      return null;
    }

    const data = await response.json();
    
    // Update the session with the new tokens
    const updatedSession: ExtendedSession = {
      ...session,
      idToken: data.id_token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || session.refreshToken, // Use new refresh token if provided
    };

    // TODO: Update the session in the session store
    // This requires access to the session store, which depends on your Auth0 setup
    
    return updatedSession;
  } catch (error) {
    console.error('Error refreshing Auth0 session:', error);
    return null;
  }
}
