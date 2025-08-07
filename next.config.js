/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,
  
  // Image optimization configuration
  images: {
    domains: ['lh3.googleusercontent.com'], // For Auth0 profile images
    unoptimized: process.env.NODE_ENV === 'production' ? false : true,
  },
  
  // Vercel optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Enable server components
  experimental: {
    serverComponentsExternalPackages: ['@auth0/nextjs-auth0'],
  },
  
  // Output standalone for better Vercel compatibility
  output: 'standalone',
  // Environment variables validation
  env: {},
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
