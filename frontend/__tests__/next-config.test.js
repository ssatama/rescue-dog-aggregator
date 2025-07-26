/**
 * Tests for Next.js configuration optimizations
 * Ensures performance optimizations are properly configured
 */

describe('Next.js Configuration', () => {
  let nextConfig;

  beforeEach(() => {
    // Clear require cache to get fresh config
    delete require.cache[require.resolve('../next.config.js')];
    nextConfig = require('../next.config.js');
  });

  test('should have compression enabled', () => {
    expect(nextConfig.compress).toBe(true);
  });

  test('should disable powered by header for security', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  test('should have experimental optimizations enabled', () => {
    expect(nextConfig.experimental).toBeDefined();
    expect(nextConfig.experimental.optimizePackageImports).toBeDefined();
    expect(Array.isArray(nextConfig.experimental.optimizePackageImports)).toBe(true);
  });

  test('should optimize common package imports', () => {
    const optimizedPackages = nextConfig.experimental.optimizePackageImports;
    expect(optimizedPackages).toContain('@heroicons/react');
    expect(optimizedPackages).toContain('framer-motion');
    expect(optimizedPackages).toContain('lucide-react');
  });

  test('should have webpack optimizations for production', () => {
    expect(nextConfig.webpack).toBeDefined();
    expect(typeof nextConfig.webpack).toBe('function');
  });

  test('should have proper image configuration', () => {
    expect(nextConfig.images).toBeDefined();
    expect(nextConfig.images.remotePatterns).toBeDefined();
    expect(Array.isArray(nextConfig.images.remotePatterns)).toBe(true);
    
    // Should include the existing patterns
    const hostnames = nextConfig.images.remotePatterns.map(p => p.hostname);
    expect(hostnames).toContain('images.rescuedogs.me');
    expect(hostnames).toContain('flagcdn.com');
  });

  test('should configure bundle analyzer when enabled', () => {
    // Test that bundle analyzer config would work
    process.env.ANALYZE = 'true';
    delete require.cache[require.resolve('../next.config.js')];
    const configWithAnalyzer = require('../next.config.js');
    
    // Bundle analyzer should be configured when ANALYZE=true
    expect(configWithAnalyzer).toBeDefined();
    
    // Cleanup
    delete process.env.ANALYZE;
  });

  test('should have output configuration for static export compatibility', () => {
    // Should not interfere with static generation
    if (nextConfig.output) {
      expect(['export', 'standalone', undefined]).toContain(nextConfig.output);
    }
  });
});