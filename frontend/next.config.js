const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,

  // Generate unique build IDs for better chunk cache invalidation
  generateBuildId: async () => {
    // Use git commit SHA if available (Vercel provides this)
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
      return process.env.VERCEL_GIT_COMMIT_SHA;
    }
    // Use local git SHA for development builds
    try {
      const { execSync } = require('child_process');
      return execSync('git rev-parse HEAD').toString().trim();
    } catch {
      // Fallback to timestamp only if git is unavailable
      return `build-${Date.now()}`;
    }
  },

  // A prerendered page can make several API calls in sequence, and each one
  // retries a transient backend failure rather than aborting the whole build
  // (see src/utils/serverFetch.ts). /breeds/mixed makes four such calls in a
  // row, so a sustained outage costs 4 x 30s of backoff there; the default 60s
  // would let Next kill the page for running long, which is the exact failure
  // the retry exists to prevent. serverFetch.test.ts pins this relationship.
  staticPageGenerationTimeout: 180,

  env: (process.env.NODE_ENV === 'test' || process.env.NEXT_PUBLIC_API_URL === 'http://localhost:3000') ? {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  } : {},

  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/api/:path*',
        },
      ];
    }
    return [];
  },

  async redirects() {
    return [
      {
        source: '/en-:locale(AT|BE|BG|CH|CY|CZ|DE|DK|EE|ES|FI|FR|GB|GR|HR|HU|IE|IT|LT|LU|LV|MT|NL|NO|PL|PT|RO|SE|SI|SK)/:path*',
        destination: '/:path*',
        permanent: true,
      },
      {
        source: '/en-:locale(AT|BE|BG|CH|CY|CZ|DE|DK|EE|ES|FI|FR|GB|GR|HR|HU|IE|IT|LT|LU|LV|MT|NL|NO|PL|PT|RO|SE|SI|SK)',
        destination: '/',
        permanent: true,
      },
      // This guide argued the case for adopting from abroad, which the
      // European rescue guide already covered in its objections and country
      // sections. Two guides owning the same facts is how they drifted apart.
      {
        source: '/guides/why-rescue-from-abroad',
        destination: '/guides/european-rescue-guide',
        permanent: true,
      },
      // A cross is a facet of a breed, not a separate breed, so these pages
      // merged into their canonical breed rather than standing alone.
      {
        source: '/breeds/staffordshire-bull-terrier-mix',
        destination: '/breeds/staffordshire-bull-terrier',
        permanent: true,
      },
      {
        source: '/breeds/german-shepherd-mix',
        destination: '/breeds/german-shepherd-dog',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
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
            value: 'noindex',
          },
        ],
      },
      {
        source: '/_next/static/css/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  experimental: {
    optimizePackageImports: [
      '@heroicons/react',
      'framer-motion',
      'lucide-react'
    ]
  },

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
      },
      {
        protocol: 'https',
        hostname: 'r2.cloudflarestorage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.rescuedogs.me',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.dogstrust.org.uk',
        port: '',
        pathname: '/**',
      }
    ],
    // Resize via Cloudflare (/cdn-cgi/image/) instead of Vercel's metered
    // optimizer — images.rescuedogs.me already does resizing and Accept-based
    // format negotiation. See src/utils/cloudflareImageLoader.ts.
    loader: 'custom',
    loaderFile: './src/utils/cloudflareImageLoader.ts',
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 768, 1080, 1920],
    imageSizes: [32, 64, 128, 256],
    unoptimized: false,
  },
};

// Apply bundle analyzer first, then Sentry
module.exports = withBundleAnalyzer(nextConfig);

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  module.exports,
  {
    org: "sampo-cr",
    project: "javascript-nextjs",
    silent: !process.env.CI,
    widenClientFileUpload: false,
    tunnelRoute: "/monitoring",
    sourcemaps: {
      deleteSourcemapsAfterUpload: process.env.NODE_ENV === 'production',
    },
    bundleSizeOptimizations: {
      excludeDebugStatements: true,
    },
  }
);
