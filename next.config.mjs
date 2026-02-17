/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    allowedDevOrigins: ['192.168.1.115'],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/node_modules', '**/.next', '**/*.db', '**/*.db-journal', '**/*.sqlite', '**/*.log'],
      }
    }
    return config
  },
}

export default nextConfig
