import { render } from '@testing-library/react';
import RootLayout, { metadata } from '@/app/layout';
import fs from 'fs';
import path from 'path';

describe('Favicon Integration', () => {
  describe('Metadata Configuration', () => {
    test('should include favicon icon in metadata', () => {
      expect(metadata.icons).toBeDefined();
      expect(metadata.icons.icon).toBe('/favicon.ico');
    });

    test('should include apple touch icon in metadata', () => {
      expect(metadata.icons).toBeDefined();
      expect(metadata.icons.apple).toBe('/apple-touch-icon.png');
    });

    test('should include manifest in metadata', () => {
      expect(metadata.manifest).toBe('/site.webmanifest');
    });

    test('should include PNG favicon variants in metadata', () => {
      expect(metadata.icons.other).toBeDefined();
      expect(metadata.icons.other).toHaveLength(2);
      expect(metadata.icons.other[0].url).toBe('/favicon-32x32.png');
      expect(metadata.icons.other[1].url).toBe('/favicon-16x16.png');
    });
  });

  describe('Favicon File Existence', () => {
    const publicDir = path.join(process.cwd(), 'public');

    test('favicon.ico should exist in public directory', () => {
      const faviconPath = path.join(publicDir, 'favicon.ico');
      expect(fs.existsSync(faviconPath)).toBe(true);
    });

    test('apple-touch-icon.png should exist in public directory', () => {
      const appleTouchIconPath = path.join(publicDir, 'apple-touch-icon.png');
      expect(fs.existsSync(appleTouchIconPath)).toBe(true);
    });

    test('site.webmanifest should exist in public directory', () => {
      const manifestPath = path.join(publicDir, 'site.webmanifest');
      expect(fs.existsSync(manifestPath)).toBe(true);
    });

    test('android chrome icons should exist in public directory', () => {
      const androidIcons = [
        'android-chrome-192x192.png',
        'android-chrome-512x512.png'
      ];

      androidIcons.forEach(icon => {
        const iconPath = path.join(publicDir, icon);
        expect(fs.existsSync(iconPath)).toBe(true);
      });
    });
  });

  describe('PWA Manifest Content', () => {
    test('manifest should contain correct app metadata', () => {
      const manifestPath = path.join(process.cwd(), 'public', 'site.webmanifest');
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);
      
      expect(manifest.name).toBe('Rescue Dog Aggregator');
      expect(manifest.short_name).toBe('RescueDogs');
      expect(manifest.icons).toHaveLength(2);
      expect(manifest.icons[0].src).toBe('/android-chrome-192x192.png');
      expect(manifest.icons[1].src).toBe('/android-chrome-512x512.png');
    });
  });
});