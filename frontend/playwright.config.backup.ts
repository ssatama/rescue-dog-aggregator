import { defineConfig, devices } from "playwright/test";

/**
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

  /* Retry failed tests twice for all environments */
  retries: 2,

  /* Optimize workers for M4 MacBook Air - use 8 cores locally, 2 on CI for stability */
  workers: process.env.CI ? 2 : 8,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["html"],
    ["list"],
    /* GitHub Actions reporter for enhanced CI integration and annotations */
    ...(process.env.CI && process.env.GITHUB_ACTIONS ? [["github"] as const] : []),
    /* JUnit reporter for CI systems that consume XML reports */
    ...(process.env.CI
      ? [["junit", { outputFile: "test-results/junit-results.xml" }] as const]
      : []),
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "retain-on-failure",

    /* Take screenshot on failure */
    screenshot: "only-on-failure",

    /* Record video on failure */
    video: "retain-on-failure",

    /* Global test timeout */
    actionTimeout: 10000,
  },

  /* Configure global test timeout */
  timeout: 30000,
  expect: {
    timeout: 10000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    {
      name: "edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },

    /* Test against mobile viewports with correct device emulation */
    {
      name: "iPhone 16 Pro - Mobile Safari",
      use: { 
        ...devices["iPhone 15 Pro"], // Use iPhone 15 Pro as closest match to iPhone 16 Pro
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      },
    },
    {
      name: "iPhone 15 Pro - Mobile Safari", 
      use: { 
        ...devices["iPhone 15 Pro"],
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "Samsung Galaxy S21 - Mobile Chrome",
      use: { 
        ...devices["Galaxy S21"], // Use Galaxy S21 as closest to S25
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "Custom Samsung Galaxy - Mobile Chrome",
      use: {
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
      },
    },

    /* Test against tablet viewports */
    {
      name: "iPad Mini - Mobile Safari",
      use: { 
        ...devices["iPad Mini"],
        hasTouch: true,
        isMobile: false, // Tablet, not phone
      },
    },
    {
      name: "iPad Pro - Mobile Safari",
      use: { 
        ...devices["iPad Pro"],
        hasTouch: true,
        isMobile: false,
      },
    },

    /* Mobile-specific testing project */
    {
      name: "mobile",
      use: {
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      },
      testMatch: '**/mobile-*.spec.ts',
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
