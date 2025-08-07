# ChatGPT Clone - Mobile First

A mobile-first ChatGPT clone built with Next.js, TRPC, Bootstrap UI, Supabase, Auth0, and Google Gemini APIs.

## Features

- **Mobile-First Design**: Optimized for mobile devices with responsive UI
- **AI Chat**: Powered by Google Gemini Pro for intelligent conversations
- **Image Generation**: Generate images using AI (simulated with descriptive text)
- **Authentication**: Secure login with Auth0
- **Persistent Storage**: Chat history stored in Supabase
- **Real-time**: Fast API communication with TRPC
- **Type-Safe**: Full TypeScript support

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Bootstrap 5, Custom CSS
- **API**: TRPC with React Query
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Auth0
- **AI**: Google Gemini Pro API
- **Deployment**: Ready for Vercel/Netlify

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.local` and fill in your API keys:

```bash
# Auth0 Configuration
AUTH0_SECRET='use [openssl rand -hex 32] to generate a 32 bytes value'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://YOUR_DOMAIN.auth0.com'
AUTH0_CLIENT_ID='YOUR_AUTH0_CLIENT_ID'
AUTH0_CLIENT_SECRET='YOUR_AUTH0_CLIENT_SECRET'

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL='YOUR_SUPABASE_PROJECT_URL'
NEXT_PUBLIC_SUPABASE_ANON_KEY='YOUR_SUPABASE_ANON_KEY'

# Google Gemini API Configuration
GOOGLE_GEMINI_API_KEY='YOUR_GOOGLE_GEMINI_API_KEY'
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. Enable Row Level Security (RLS) policies

### 4. Auth0 Setup

1. Create an Auth0 application
2. Set callback URLs:
   - Allowed Callback URLs: `http://localhost:3000/api/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000`
3. Copy your domain, client ID, and client secret to `.env.local`

### 5. Google Gemini API Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env.local` file

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your mobile browser or device.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Main chat interface
│   └── globals.css         # Global styles
├── pages/api/
│   ├── auth/[...auth0].ts  # Auth0 API routes
│   └── trpc/[trpc].ts      # TRPC API handler
├── server/api/
│   ├── trpc.ts             # TRPC configuration
│   ├── root.ts             # Root router
│   └── routers/
│       └── chat.ts         # Chat operations
└── utils/
    └── api.ts              # TRPC client setup
```

## API Endpoints

### Chat Operations
- `chat.sendMessage` - Send a text message and get AI response
- `chat.generateImage` - Generate image from text prompt
- `chat.getConversations` - Get user's conversation history
- `chat.getMessages` - Get messages from a specific conversation
- `chat.createConversation` - Create a new conversation

## Mobile-First Design

The app is designed mobile-first with:
- Touch-friendly interface
- Optimized for small screens
- Responsive layout
- Smooth animations
- Accessible controls

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Netlify

1. Build the project: `npm run build`
2. Deploy the `out` folder to Netlify
3. Configure environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on mobile devices
5. Submit a pull request

## License

MIT License - feel free to use this project for learning and development!

## Support

If you encounter any issues:
1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure your APIs (Auth0, Supabase, Gemini) are properly configured
4. Test on different mobile devices and browsers