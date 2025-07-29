import { chromium, FullConfig } from 'playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
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
  
  // Start browser for warmup (optional)
  const browser = await chromium.launch();
  await browser.close();
}

export default globalSetup;