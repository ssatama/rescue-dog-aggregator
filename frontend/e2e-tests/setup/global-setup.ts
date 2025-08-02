import { chromium, FullConfig } from 'playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { ServerLifecycleManager } from './server-lifecycle';

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
    const serverManager = new ServerLifecycleManager();
    
    console.log('🔧 Managing server lifecycle for local E2E tests...');
    const serversReady = await serverManager.startAllServers();
    
    if (!serversReady) {
      console.error('❌ Failed to start required servers for E2E tests');
      process.exit(1);
    }
    
    // Store server manager for cleanup in teardown
    (globalThis as any).__serverManager = serverManager;
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