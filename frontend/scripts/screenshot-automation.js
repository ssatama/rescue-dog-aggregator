const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/*
 * Device specifications verified through comprehensive research using multiple authoritative sources.
 * Each device spec includes CSS viewport dimensions (NOT physical resolution), device pixel ratio,
 * and current 2025 user agent strings. See individual research documentation for source verification.
 * 
 * Source of Truth: https://gist.github.com/mfehrenbach/aaf646bee2e8880b5142d92e20b633d4
 * 
 * Key breakpoint behavior with Tailwind CSS (md: 768px):
 * - < 768px = Mobile layout (mobile filter button)
 * - ≥ 768px = Desktop layout (desktop filter sidebar)
 */
const DEVICES = [
  // === MOBILE PHONES (< 768px) ===
  { 
    name: 'iphone-se',
    // Source: https://gist.github.com/mfehrenbach/aaf646bee2e8880b5142d92e20b633d4 - iPhone SE
    // CSS Viewport: 320×449 (mobile layout < 768px)
    width: 320, 
    height: 449, 
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1'
  },
  { 
    name: 'iphone-15-plus',
    // Source: https://gist.github.com/mfehrenbach/aaf646bee2e8880b5142d92e20b633d4 - iPhone 15 Plus
    // CSS Viewport: 428×739 (mobile layout < 768px)
    width: 428, 
    height: 739, 
    deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1'
  },
  { 
    name: 'samsung-galaxy-s24-ultra',
    // Source: Blisk.io, WebMobileFirst
    // CSS Viewport: 384×824 (mobile layout < 768px)
    width: 384, 
    height: 824, 
    deviceScaleFactor: 3.75,
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36'
  },
  
  // === TABLETS (Mixed based on orientation) ===
  { 
    name: 'ipad-mini-6th',
    // Source: https://gist.github.com/mfehrenbach/aaf646bee2e8880b5142d92e20b633d4 - iPad Mini 6th
    // CSS Viewport: 744×1026 portrait (mobile layout < 768px)
    width: 744, 
    height: 1026, 
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1'
  },
  { 
    name: 'ipad-10th-gen',
    // Source: https://gist.github.com/mfehrenbach/aaf646bee2e8880b5142d92e20b633d4 - iPad 10th
    // CSS Viewport: 820×1180 portrait (desktop layout ≥ 768px)
    width: 820, 
    height: 1180, 
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1'
  },
  { 
    name: 'ipad-pro-129-inch',
    // Source: https://gist.github.com/mfehrenbach/aaf646bee2e8880b5142d92e20b633d4 - iPad Pro 12.9"
    // CSS Viewport: 1024×1366 portrait (desktop layout ≥ 768px)
    width: 1024, 
    height: 1366, 
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1'
  },
  
  // === DESKTOP (≥ 768px) ===
  { 
    name: 'macbook-air-13-inch',
    // Source: https://gist.github.com/mfehrenbach/aaf646bee2e8880b5142d92e20b633d4 - MacBook Air 13"
    // CSS Viewport: 1280×715 (desktop layout ≥ 768px)
    width: 1280, 
    height: 715, 
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    isDesktop: true
  }
];

const PAGES = [
  { name: 'home', url: 'http://localhost:3000' },
  { name: 'dogs', url: 'http://localhost:3000/dogs' },
  { name: 'dog-detail', url: 'http://localhost:3000/dogs/saga-mixed-breed-1835' },
  { name: 'organizations', url: 'http://localhost:3000/organizations' },
  { name: 'organization-detail', url: 'http://localhost:3000/organizations/tierschutzverein-europa-ev-11' }
];

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

async function verifyViewport(page, expectedWidth, expectedHeight) {
  const viewport = page.viewportSize();
  if (viewport.width !== expectedWidth || viewport.height !== expectedHeight) {
    throw new Error(`Viewport mismatch! Expected ${expectedWidth}x${expectedHeight}, got ${viewport.width}x${viewport.height}`);
  }
  console.log(`✓ Viewport verified: ${expectedWidth}x${expectedHeight}`);
}

/**
 * Production-code-based page readiness detection
 */
async function waitForPageReady(page, pageConfig) {
  console.log(`    ⏱️  Navigating to ${pageConfig.url}...`);
  
  // Add error listener only (skip verbose console logging)
  page.on('pageerror', err => console.log('    ❌ ERROR:', err.message));
  
  // Navigate and wait for DOM
  await page.goto(pageConfig.url, { 
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  console.log(`    ⌛ Waiting for network idle...`);
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  
  console.log(`    🔄 Checking page-specific content readiness...`);
  
  const pathname = new URL(pageConfig.url).pathname;
  
  try {
    if (pathname === '/') {
      // Home page: wait for hero section with statistics loaded
      console.log(`    🏠 Waiting for home page content...`);
      await page.waitForSelector('[data-testid="hero-section"]', { 
        state: 'visible',
        timeout: 15000 
      });
      
      // Wait for hero content to be loaded (not loading state)
      await page.waitForSelector('[data-testid="hero-content"]', { 
        state: 'visible',
        timeout: 10000 
      });
      
      // Wait for statistics to load (not showing loading state)
      await page.waitForFunction(() => {
        const heroSection = document.querySelector('[data-testid="hero-section"]');
        if (!heroSection) return false;
        
        // Check if there's actual content, not just loading text
        const hasLoadingText = heroSection.textContent.includes('Loading');
        const hasStatistics = heroSection.textContent.match(/\d+/) !== null; // Has numbers (statistics)
        
        return !hasLoadingText && hasStatistics;
      }, { timeout: 20000 });
      
    } else if (pathname === '/dogs') {
      // Dogs page: wait for the main container and grid
      console.log(`    🐕 Waiting for dogs page content...`);
      await page.waitForSelector('[data-testid="dogs-page-container"]', { 
        state: 'visible',
        timeout: 15000 
      });
      
      // Wait for the dogs grid to be present
      await page.waitForSelector('[data-testid="dogs-grid"]', { 
        state: 'visible',
        timeout: 15000 
      });
      
      // Wait for either dog cards to load OR empty state
      await Promise.race([
        // Dogs loaded
        page.waitForSelector('[data-testid="dogs-grid"] article', { 
          state: 'visible',
          timeout: 15000 
        }),
        // Empty state
        page.waitForSelector('[data-testid*="empty"]', { 
          state: 'visible',
          timeout: 15000 
        }),
        // Just wait a bit if neither appears
        page.waitForTimeout(3000)
      ]);
      
    } else if (pathname.startsWith('/dogs/')) {
      // Dog detail page: wait for main content
      console.log(`    🐶 Waiting for dog detail content...`);
      await page.waitForSelector('h1', { 
        state: 'visible',
        timeout: 15000 
      });
      
      await page.waitForSelector('main', { 
        state: 'visible',
        timeout: 10000 
      });
      
    } else if (pathname === '/organizations') {
      // Organizations page: wait for content
      console.log(`    🏢 Waiting for organizations page content...`);
      await page.waitForSelector('h1', { 
        state: 'visible',
        timeout: 15000 
      });
      
      await page.waitForSelector('main', { 
        state: 'visible',
        timeout: 10000 
      });
      
    } else if (pathname.startsWith('/organizations/')) {
      // Organization detail page: wait for content
      console.log(`    🏛️ Waiting for organization detail content...`);
      await page.waitForSelector('h1', { 
        state: 'visible',
        timeout: 15000 
      });
      
      await page.waitForSelector('main', { 
        state: 'visible',
        timeout: 10000 
      });
    }
    
    console.log(`    ✅ Page content loaded for ${pageConfig.name}`);
    
    // Wait for any lazy images to start loading
    await page.waitForTimeout(2000);
    
  } catch (error) {
    console.log(`    ⚠️  Content check timeout for ${pageConfig.name}, continuing anyway...`);
    console.log(`    Details: ${error.message}`);
    // Don't throw - continue with screenshot
  }
  
  console.log(`    ✅ Page ready for ${pageConfig.name}`);
}

/**
 * Simplified scrolling with proper lazy loading handling
 */
async function triggerLazyLoading(page) {
  console.log(`    📜 Triggering lazy content loading...`);
  
  // Set up screen media emulation for consistent rendering
  await page.emulateMedia({ media: 'screen' });
  
  // Add print-specific CSS adjustments
  await page.addStyleTag({
    content: `
      * { 
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body { 
        overflow-x: visible !important;
      }
    `
  });
  
  // Scroll to trigger lazy loading, then detect when back at top
  const isAtTop = await page.evaluate(async () => {
    // First scroll to bottom to get full height
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const fullHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    
    // Now scroll from bottom to top in larger increments (faster)
    const scrollStep = 200; // Larger increments for faster scrolling
    const scrollDelay = 150; // Faster delay but still enough for lazy loading
    
    // Start from bottom
    let currentPosition = fullHeight;
    let loadingImageCount = 0;
    
    while (currentPosition > 0) {
      currentPosition = Math.max(0, currentPosition - scrollStep);
      window.scrollTo(0, currentPosition);
      
      // Wait for lazy loading to trigger at this position
      await new Promise(resolve => setTimeout(resolve, scrollDelay));
      
      // Check for loading images but only log occasionally to reduce noise
      const loadingImages = Array.from(document.querySelectorAll('img')).filter(img => 
        !img.complete || img.naturalHeight === 0
      );
      
      if (loadingImages.length > 0 && loadingImages.length !== loadingImageCount) {
        loadingImageCount = loadingImages.length;
        // Only log when count changes significantly
        if (loadingImageCount % 5 === 0) {
          console.log(`${loadingImageCount} images still loading...`);
        }
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
    
    // Final scroll to top
    window.scrollTo(0, 0);
    
    // Return immediately when at top - no unnecessary waiting
    return window.scrollY === 0;
  });
  
  if (isAtTop) {
    console.log(`    ✅ Scrolled to top, ready for capture`);
    // Skip image check - we already triggered lazy loading during scroll
  } else {
    console.log(`    ⚠️  Not quite at top, waiting briefly...`);
    await page.waitForTimeout(500);
    
    // Only do image check if we weren't properly positioned
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      if (images.length === 0) return true;
      
      return images.every(img => {
        if (!img.src || img.src.startsWith('data:')) return true;
        return img.complete && img.naturalHeight !== 0;
      });
    }, { timeout: 3000 }).catch(() => {
      console.log(`    ⚠️  Some images still loading, capturing anyway...`);
    });
  }
  
  console.log(`    ✅ Lazy loading complete`);
}

/**
 * Calculate full document height for PDF generation (fast version)
 */
async function getFullPageHeight(page) {
  return await page.evaluate(() => {
    // Simple, fast method - just use document height since we already scrolled
    return Math.max(
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight,
      document.body.scrollHeight,
      document.body.offsetHeight
    );
  });
}

async function captureScreenshots() {
  // Create timestamp for this run
  const now = new Date();
  const timestamp = now.toLocaleDateString('en-CA') + '_' + now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/:/g, '-');

  // Create screenshots directory
  const outputDir = path.join(__dirname, '..', '..', 'screenshots');
  await ensureDirectoryExists(outputDir);

  // Launch browser in headless mode for background operation
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  let totalCaptured = 0;
  
  try {
    const totalScreenshots = DEVICES.length * PAGES.length;
    
    for (const device of DEVICES) {
      console.log(`\n📱 Starting captures for ${device.name} (${device.width}x${device.height})`);
      
      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
        deviceScaleFactor: device.deviceScaleFactor || 1,
        isMobile: !device.isDesktop,
        hasTouch: !device.isDesktop,
        userAgent: device.userAgent,
      });
      
      const page = await context.newPage();
      
      // Verify viewport
      await verifyViewport(page, device.width, device.height);
      
      for (const pageConfig of PAGES) {
        console.log(`  📄 Capturing ${pageConfig.name}...`);
        
        try {
          // Enhanced page loading and readiness detection
          await waitForPageReady(page, pageConfig);
          
          // Trigger all lazy loading
          console.log(`    📜 Starting lazy loading...`);
          await triggerLazyLoading(page);
          console.log(`    📜 Lazy loading finished`);
          
          // Calculate accurate page height
          console.log(`    📏 Calculating page height...`);
          const fullHeight = await getFullPageHeight(page);
          console.log(`    📏 Full page height: ${fullHeight}px`);
          
          // Generate PDF with optimized settings
          console.log(`    📄 Generating PDF...`);
          const prefix = device.isDesktop ? 'desktop' : 'mobile';
          const filename = `${prefix}_${device.name}-${pageConfig.name}_${timestamp}.pdf`;
          const outputPath = path.join(outputDir, filename);
          
          await page.pdf({
            path: outputPath,
            width: `${device.width}px`,
            height: `${Math.ceil(fullHeight + 50)}px`, // Small buffer
            printBackground: true,
            margin: { top: '0', bottom: '0', left: '0', right: '0' },
            preferCSSPageSize: false,
            scale: 1.0,
            // Additional PDF options for better quality
            format: undefined, // Use custom dimensions
            landscape: false
          });
          
          totalCaptured++;
          console.log(`    ✅ Saved: ${filename} (${totalCaptured}/${totalScreenshots})`);
          
        } catch (error) {
          console.error(`    ❌ Error capturing ${pageConfig.name}:`, error.message);
          console.error(`    Details:`, error.stack);
        }
      }
      
      await context.close();
      console.log(`✅ Completed ${device.name}`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error in screenshot automation:', error);
  } finally {
    await browser.close();
  }
  
  console.log(`\n🎉 Screenshot automation complete!`);
  console.log(`📁 Files saved to: ${outputDir}`);
  console.log(`📊 Total screenshots captured: ${totalCaptured}/${DEVICES.length * PAGES.length}`);
}

// Enhanced error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the automation
captureScreenshots().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});