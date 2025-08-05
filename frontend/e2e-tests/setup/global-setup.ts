import { chromium, FullConfig } from 'playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');
  
  // Enable custom server management only when running locally (not in CI)
  if (!process.env.CI) {
    process.env.USE_CUSTOM_SERVER_MANAGER = 'true';
  }
  
  // Load E2E environment variables
  dotenv.config({ path: path.join(__dirname, '../../.env.e2e') });
  
  // Set default selector strategy if not specified
  if (!process.env.E2E_SELECTOR_STRATEGY) {
    process.env.E2E_SELECTOR_STRATEGY = 'testIdFirst';
  }
  
  console.log(`🎯 E2E Selector Strategy: ${process.env.E2E_SELECTOR_STRATEGY}`);
  
  // Set Firefox-specific environment flag for tests to handle differently
  if (process.env.TEST_BROWSER === 'firefox') {
    process.env.FIREFOX_TEST_MODE = 'true';
  }
  
  // Server lifecycle management - ONLY when running locally
  if (!process.env.CI) {
    console.log('⚠️  Local server management disabled (server-lifecycle module missing)');
    console.log('💡 Please ensure Next.js dev server is running manually on port 3000');
  } else {
    console.log('⏭️  Using CI server management (not starting local servers)');
  }
  
  // Start browser for warmup
  console.log('🔥 Warming up browser...');
  const browser = await chromium.launch();
  await browser.close();
  
  console.log('✅ Global setup complete');
}

export default globalSetup;