/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
    NEXT_PUBLIC_MEM0_URL: process.env.NEXT_PUBLIC_MEM0_URL || 'http://localhost:8002',
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const mem0Url = process.env.NEXT_PUBLIC_MEM0_URL || 'http://localhost:8002';
    return [
      {
        source: '/api/gateway/:path*',
        destination: `${apiUrl}/:path*`,
      },
      {
        source: '/api/mem0/:path*',
        destination: `${mem0Url}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
