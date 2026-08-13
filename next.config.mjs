/** @type {import('next').NextConfig} */
const api = (process.env.API_URL || 'http://127.0.0.1:3044').replace(/\/$/, '');

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/admin/:path*',
        destination: `${api}/api/admin/:path*`,
      },
      {
        source: '/photos/:path*',
        destination: `${api}/photos/:path*`,
      },
    ];
  },
};

export default nextConfig;
