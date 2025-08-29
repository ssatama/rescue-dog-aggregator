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
  
  // API proxy configuration for development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
  
  // Headers configuration for static assets and SEO
  async headers() {
    return [
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'X-Robots-Tag',
            value: 'all',
          },
        ],
      },
      {
        source: '/_next/static/css/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'all',
          },
        ],
      },
    ];
  },
  
  // External packages for server components
  serverExternalPackages: ['react-window', 'react-virtualized-auto-sizer'],
  
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

  // Enhanced webpack optimizations for production builds
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Enhanced bundle splitting for better caching and loading
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // CSS files should be in their own chunks - NEVER in JS chunks
          styles: {
            name: 'styles',
            test: /\.css$/,
            chunks: 'all',
            enforce: true,
            priority: 30, // Highest priority to prevent CSS in JS chunks
            type: 'css/mini-extract', // Ensure CSS extraction
          },
          // Separate vendor libraries for better caching
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            enforce: true,
          },
          // React-specific chunk for better caching
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react-vendor',
            chunks: 'all',
            priority: 20,
            enforce: true,
          },
          // UI library chunk
          ui: {
            test: /[\\/]node_modules[\\/](@heroicons|lucide-react|framer-motion)[\\/]/,
            name: 'ui-vendor',
            chunks: 'all',
            priority: 15,
            enforce: true,
          },
          // Common code chunk for app-specific reused code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
            minSize: 0,
          },
        },
      };

      // Performance optimizations
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }

    return config;
  },
};

module.exports = nextConfig;