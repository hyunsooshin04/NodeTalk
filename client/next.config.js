/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // @atproto/api를 클라이언트 사이드에서만 번들링
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;

