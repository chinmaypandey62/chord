/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['gravatar.com', 'i.pravatar.cc'],
  },
  // Configure for proper page routing
  trailingSlash: false,
  poweredByHeader: false,
  reactStrictMode: true,
};

module.exports = nextConfig;
