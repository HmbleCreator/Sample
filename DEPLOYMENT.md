# 🚀 Vercel Deployment Guide

## Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/chatgpt-clone)

## Manual Deployment Steps

### 1. Prerequisites
- GitHub account
- Vercel account (free)
- Auth0 account (free)
- Supabase account (free)
- Google AI Studio account (free)

### 2. Setup External Services

#### Auth0 Setup
1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Create a new application (Single Page Application)
3. Configure:
   - **Allowed Callback URLs**: `https://your-app.vercel.app/api/auth/callback`
   - **Allowed Logout URLs**: `https://your-app.vercel.app`
   - **Allowed Web Origins**: `https://your-app.vercel.app`

#### Supabase Setup
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Go to SQL Editor and run the schema from `supabase-schema.sql`
4. Get your project URL and anon key from Settings > API

#### Google Gemini API Setup
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Save it securely

### 3. Deploy to Vercel

#### Option A: GitHub Integration (Recommended)
1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js settings

#### Option B: Vercel CLI
```bash
npm i -g vercel
vercel
```

### 4. Configure Environment Variables

In your Vercel project dashboard, go to Settings > Environment Variables and add:

```bash
# Auth0 Configuration
AUTH0_SECRET=your_32_character_secret_key
AUTH0_BASE_URL=https://your-app.vercel.app
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API Configuration
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key
```

**Generate AUTH0_SECRET:**
```bash
openssl rand -hex 32
```

### 5. Deploy!
- Push changes to your main branch
- Vercel will automatically deploy
- Your app will be live at `https://your-app.vercel.app`

## 🔧 Vercel Optimizations

This project is pre-configured with:
- ✅ SWC minification for faster builds
- ✅ Compression enabled
- ✅ Security headers
- ✅ Image optimization
- ✅ API routes optimized for serverless
- ✅ TypeScript support

## 📱 Mobile Testing

After deployment, test on various devices:
- iPhone Safari
- Android Chrome
- iPad
- Desktop (should work but not optimized)

## 🐛 Troubleshooting

### Common Issues:
1. **Build fails**: Check TypeScript errors in build logs
2. **Auth0 not working**: Verify callback URLs match your domain
3. **Supabase connection issues**: Check environment variables
4. **Gemini API errors**: Verify API key and quota

### Debug Steps:
1. Check Vercel build logs
2. Use browser dev tools on mobile
3. Check Vercel function logs for API errors

## 🎯 Production Checklist

- [ ] All environment variables configured
- [ ] Auth0 callback URLs updated
- [ ] Supabase RLS policies enabled
- [ ] Google Gemini API key working
- [ ] Mobile testing completed
- [ ] Custom domain configured (optional)

Your ChatGPT clone is now live! 🎉
