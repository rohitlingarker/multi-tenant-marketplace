// Browser calls /api/* on :3000; Next proxies to FastAPI, so no CORS setup is needed on the backend.
const API_URL = process.env.API_URL || 'http://localhost:8000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;
