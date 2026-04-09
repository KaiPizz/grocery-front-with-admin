/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Allow storefront origins to call config API
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.CORS_ORIGIN || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, PUT, PATCH, POST, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, x-api-key, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
