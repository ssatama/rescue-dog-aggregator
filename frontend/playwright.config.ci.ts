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
  
  /* Test with single worker to rule out resource contention */
  workers: 1,
  
  /* Increased timeouts for CI environment */
  use: {
    ...baseConfig.use,
    /* Increased action timeout for slower CI environment */
    actionTimeout: 15000, // Increased for better CI reliability
    /* Add explicit navigation timeout */
    navigationTimeout: 30000,
    /* Enhanced debugging for CI failures */
    trace: 'on-first-retry', // Capture trace files for failed tests
    video: 'retain-on-failure', // Record videos only for failures
    screenshot: 'only-on-failure', // Screenshots for failed tests
  },
  
  /* Increased global timeout for CI */
  timeout: 30000, // Doubled from 15000
  expect: {
    timeout: 10000, // Doubled from 5000
  },

  /* Server startup handled manually in CI workflow with wait-on */
  webServer: undefined,

  /* CI-specific navigation options */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...baseConfig.projects?.[0]?.use,
        /* Wait for network idle in CI for better stability */
        contextOptions: {
          ...baseConfig.projects?.[0]?.use?.contextOptions,
        },
        /* Override default navigation timeout behavior */
        navigationTimeout: 30000,
      },
    },
  ],
});