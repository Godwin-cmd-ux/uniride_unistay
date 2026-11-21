import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
  // Emit .next/standalone so the Docker runtime image only needs the server + static assets.
  output: 'standalone',
};

export default nextConfig;
