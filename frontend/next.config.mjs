/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  reactStrictMode: true
};

export default (phase) => ({
  ...nextConfig,
  // Keep production verification builds from replacing a running dev server's assets.
  distDir: phase === 'phase-development-server' ? '.next-dev' : '.next'
});
