/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Note: i18n routing is handled through App Router file structure
  // European SEO is implemented via hreflang tags in sitemap.xml
  
  // Environment variable configuration for testing
  env: (process.env.NODE_ENV === 'test' || process.env.NEXT_PUBLIC_API_URL === 'http://localhost:3000') ? {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  } : {},
  
  // Experimental optimizations for better performance
  experimental: {
    optimizePackageImports: [
      '@heroicons/react', 
      'framer-motion', 
      'lucide-react'
    ]
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.rescuedogs.me',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https', 
        hostname: 'flagcdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img1.wsimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
        port: '',
        pathname: '/**',
      }
    ],
  },

  // Webpack optimizations for production builds
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Optimize bundle splitting
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },
};

module.exports = nextConfig;