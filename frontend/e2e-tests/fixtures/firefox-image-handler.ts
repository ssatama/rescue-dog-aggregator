import { test as base } from 'playwright/test';

// Custom test fixture that handles Firefox-specific image loading issues
export const test = base.extend({
  page: async ({ page, browserName }, use) => {
    if (browserName === 'firefox') {
      // Return a minimal transparent PNG for all external image requests
      const transparentPNG = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
      
      // Define a comprehensive list of patterns that cause NS_BINDING_ABORTED in Firefox
      const problematicPatterns = [
        '**/flagcdn.com/**',
        '**flagcdn.com**',
        '**/logos/**',
        '**logos**',
        '**/_next/image?url=*flagcdn*',
        '**/_next/image?url=*logos*',
        '**/example.com/**'  // Mock data URLs from test fixtures
      ];
      
      // Intercept all problematic image requests with a unified handler
      for (const pattern of problematicPatterns) {
        await page.route(pattern, async route => {
          // Log for debugging (can be removed later)
          console.log(`[Firefox Image Handler] Intercepted: ${route.request().url()}`);
          
          await route.fulfill({
            status: 200,
            contentType: 'image/png',
            body: transparentPNG,
            headers: {
              'Cache-Control': 'public, max-age=3600',
              'Access-Control-Allow-Origin': '*'
            }
          });
        });
      }
      
      // Catch-all for Next.js image optimization requests
      await page.route('**/_next/image**', async route => {
        const url = route.request().url();
        const urlLower = url.toLowerCase();
        
        // Check if this URL contains any problematic patterns
        if (urlLower.includes('flagcdn') || 
            urlLower.includes('logos') || 
            urlLower.includes('example.com')) {
          
          console.log(`[Firefox Image Handler] Catch-all intercepted: ${url}`);
          
          await route.fulfill({
            status: 200,
            contentType: 'image/png',
            body: transparentPNG,
            headers: {
              'Cache-Control': 'public, max-age=3600',
              'Access-Control-Allow-Origin': '*'
            }
          });
        } else {
          // Let other image requests through
          await route.continue();
        }
      });
      
      // Additional safety net for any external image requests
      await page.route(/^https?:\/\/(?!localhost).*\.(png|jpg|jpeg|gif|svg|webp)/, async route => {
        const url = route.request().url();
        console.log(`[Firefox Image Handler] External image intercepted: ${url}`);
        
        await route.fulfill({
          status: 200,
          contentType: 'image/png',
          body: transparentPNG,
          headers: {
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*'
          }
        });
      });
    }
    
    await use(page);
  },
});

export { expect } from 'playwright/test';