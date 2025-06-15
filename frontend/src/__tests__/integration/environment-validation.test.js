/**
 * Environment Validation Tests
 * 
 * These tests ensure that the frontend environment configuration is correct
 * and compatible with the backend API, preventing configuration mismatches
 * that could break image loading or other functionality.
 */

describe('Environment Configuration Validation', () => {
  describe('Required Environment Variables', () => {
    test('NEXT_PUBLIC_API_URL is configured', () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      expect(apiUrl).toBeDefined();
      expect(apiUrl).not.toBe('');
      
      // Should be a valid URL format
      expect(() => new URL(apiUrl)).not.toThrow();
      
      // For local development, should point to localhost:8000
      if (process.env.NODE_ENV !== 'production') {
        expect(apiUrl).toBe('http://localhost:8000');
      }
    });

    test('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is configured correctly', () => {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      
      expect(cloudName).toBeDefined();
      expect(cloudName).not.toBe('');
      expect(cloudName.length).toBeGreaterThan(0);
      
      // Should follow valid cloud name format
      expect(cloudName).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(cloudName.length).toBeGreaterThan(2);
      
      // Should not be placeholder values
      expect(cloudName).not.toBe('test-cloud'); // Mock value
      expect(cloudName).not.toBe('undefined');
      expect(cloudName).not.toBe('your-cloud-name'); // Placeholder value
    });
  });

  describe('Configuration Format Validation', () => {
    test('Cloudinary cloud name follows expected format', () => {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      
      // Should be alphanumeric with possible hyphens/underscores
      expect(cloudName).toMatch(/^[a-zA-Z0-9_-]+$/);
      
      // Should not contain spaces or special characters
      expect(cloudName).not.toContain(' ');
      expect(cloudName).not.toContain('.');
      expect(cloudName).not.toContain('/');
    });

    test('API URL uses correct protocol for environment', () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const url = new URL(apiUrl);
      
      if (process.env.NODE_ENV === 'production') {
        // Production should use HTTPS
        expect(url.protocol).toBe('https:');
      } else {
        // Development/test can use HTTP
        expect(['http:', 'https:']).toContain(url.protocol);
      }
    });
  });

  describe('Configuration Consistency Checks', () => {
    test('environment variables are consistent with build-time values', () => {
      // These should be available at build time
      expect(process.env.NEXT_PUBLIC_API_URL).toBeTruthy();
      expect(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME).toBeTruthy();
      
      // Values should not be build-time placeholders
      expect(process.env.NEXT_PUBLIC_API_URL).not.toBe('{{API_URL}}');
      expect(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME).not.toBe('{{CLOUD_NAME}}');
    });

    test('no environment variables are undefined or null strings', () => {
      const envVars = [
        'NEXT_PUBLIC_API_URL',
        'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'
      ];

      envVars.forEach(varName => {
        const value = process.env[varName];
        expect(value).not.toBe('undefined');
        expect(value).not.toBe('null');
        expect(value).not.toBe('');
      });
    });
  });

  describe('Runtime Configuration Validation', () => {
    test('can construct valid Cloudinary URLs', () => {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const testUrl = `https://res.cloudinary.com/${cloudName}/image/upload/v123/test.jpg`;
      
      // Should be a valid URL
      expect(() => new URL(testUrl)).not.toThrow();
      
      const url = new URL(testUrl);
      expect(url.hostname).toBe('res.cloudinary.com');
      expect(url.pathname).toContain(cloudName);
    });

    test('API URL is reachable format', () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const url = new URL(apiUrl);
      
      // Should have valid hostname
      expect(url.hostname).toBeTruthy();
      expect(url.hostname.length).toBeGreaterThan(0);
      
      // For localhost, should specify port
      if (url.hostname.includes('localhost') || url.hostname === '127.0.0.1') {
        expect(url.port).toBeTruthy();
      }
    });
  });

  describe('Image Loading Configuration Compatibility', () => {
    test('Cloudinary configuration supports image transformations', () => {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      
      // Test transformation URL generation
      const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload/`;
      const transformations = 'w_400,h_300,c_fill,q_auto,f_auto/';
      const imagePath = 'v123/test.jpg';
      
      const fullUrl = baseUrl + transformations + imagePath;
      
      expect(() => new URL(fullUrl)).not.toThrow();
      expect(fullUrl).toContain(cloudName);
      expect(fullUrl).toContain('w_400');
    });

    test('fetch API configuration is valid', () => {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const externalUrl = 'https://example.com/image.jpg';
      
      const fetchUrl = `https://res.cloudinary.com/${cloudName}/image/fetch/w_400,h_300,c_fill/${encodeURIComponent(externalUrl)}`;
      
      expect(() => new URL(fetchUrl)).not.toThrow();
      expect(fetchUrl).toContain('/image/fetch/');
      expect(fetchUrl).toContain(encodeURIComponent(externalUrl));
    });
  });

  describe('Development vs Production Configuration', () => {
    test('development configuration points to local services', () => {
      if (process.env.NODE_ENV !== 'production') {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        expect(apiUrl).toContain('localhost');
      }
    });

    test('configuration is appropriate for current environment', () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const isDevelopment = process.env.NODE_ENV !== 'production';
      
      if (isDevelopment) {
        // Development should use localhost
        expect(apiUrl).toMatch(/^https?:\/\/(localhost|127\.0\.0\.1)/);
      } else {
        // Production should use proper domain
        expect(apiUrl).not.toContain('localhost');
        expect(apiUrl).not.toContain('127.0.0.1');
      }
    });
  });
});