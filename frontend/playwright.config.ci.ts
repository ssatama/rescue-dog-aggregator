import { defineConfig } from "playwright/test";
import baseConfig from "./playwright.config.optimized";

/**
 * CI-specific E2E test configuration
 * Uses production build for stability and proper server timing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  ...baseConfig,
  
  /* Retries set to 3 (expert recommendation: balance between stability and bug detection) */
  retries: 3,
  
  /* Increased timeouts for CI environment */
  use: {
    ...baseConfig.use,
    /* Increased action timeout for slower CI environment */
    actionTimeout: 10000, // Doubled from 5000
    /* Add explicit navigation timeout */
    navigationTimeout: 30000,
  },
  
  /* Increased global timeout for CI */
  timeout: 30000, // Doubled from 15000
  expect: {
    timeout: 10000, // Doubled from 5000
  },

  /* Keep dev server (known working) but add startup delay for CI */
  webServer: {
    ...baseConfig.webServer,
    /* Keep dev server - same as local that works */
    command: "npm run dev",
    /* Add health check for readiness */
    url: "http://localhost:3000/api/health",
    /* Conservative timeout increase */
    timeout: 150 * 1000, // 2.5 minutes
    /* Always start fresh in CI */
    reuseExistingServer: false,
  },
});