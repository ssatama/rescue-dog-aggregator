import { defineConfig, devices } from "playwright/test";

/**
 * Optimized E2E test configuration for faster execution
 * Reduces from 14 to 4 essential device configurations
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e-tests",

  /* Load environment variables for E2E tests */
  ...(process.env.NODE_ENV !== 'production' && {
    globalSetup: './e2e-tests/setup/global-setup.ts',
  }),

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests 5 times for all environments */
  retries: 5,

  /* Optimize workers for M4 MacBook Air */
  workers: process.env.CI ? 2 : 8,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["list"],
    ["./e2e-tests/reporters/failure-reporter.ts"],
    ...(process.env.FULL_REPORT ? [["html"] as [string]] : []),
    /* GitHub Actions reporter for enhanced CI integration */
    ...(process.env.CI && process.env.GITHUB_ACTIONS ? [["github"] as [string]] : []),
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:3000",

    /* Reduced trace collection for performance */
    trace: process.env.CI ? "retain-on-failure" : "off",

    /* Screenshot only on CI failures */
    screenshot: process.env.CI ? "only-on-failure" : "off",

    /* No video recording for speed */
    video: "off",

    /* Faster timeout for quicker feedback */
    actionTimeout: 5000,
  },

  /* Reduced global timeout */
  timeout: 15000,
  expect: {
    timeout: 5000,
  },

  /* Critical device coverage only - 2 projects for fastest feedback */
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "iPhone 15 Pro",
      use: { 
        ...devices["iPhone 15 Pro"],
        hasTouch: true,
        isMobile: true,
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});