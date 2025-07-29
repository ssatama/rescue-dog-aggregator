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

  /* Optimize workers for M4 MacBook Air - reduce for full device matrix to prevent resource contention */
  workers: process.env.CI ? 2 : 4,

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

  /* Analytics-based device configuration - 6 devices covering 96% of traffic */
  projects: [
    // 1. Desktop Chrome (28% traffic) - Primary desktop browser
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },

    // 2. iPhone 15 Pro Safari (36% traffic) - Primary mobile browser
    {
      name: "iPhone 15 Pro - Mobile Safari",
      use: {
        ...devices["iPhone 15 Pro"],
        hasTouch: true,
        isMobile: true,
      },
    },

    // 3. Chrome Mobile iOS (15% traffic) - Chrome on iPhone
    {
      name: "iPhone 15 Pro - Chrome Mobile",
      use: {
        ...devices["iPhone 15 Pro"],
        browserName: 'chromium', // Chrome browser on iOS device
        hasTouch: true,
        isMobile: true,
      },
    },

    // 4. Chrome Mobile Android (13% traffic) - Chrome on Android
    {
      name: "Samsung Galaxy S24 - Chrome Mobile",
      use: {
        ...devices["Galaxy S24"], // Using available Galaxy S24 device
        hasTouch: true,
        isMobile: true,
      },
    },

    // 5. Firefox Desktop (2% traffic) - Desktop Firefox users
    {
      name: "Desktop Firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    // 6. Firefox Mobile (2% traffic) - Firefox with mobile viewport (isMobile not supported in Firefox)
    {
      name: "Mobile Firefox",
      use: {
        browserName: 'firefox',
        viewport: { width: 393, height: 659 }, // iPhone 15 Pro viewport
        deviceScaleFactor: 3,
        userAgent: 'Mozilla/5.0 (Mobile; rv:140.0) Gecko/140.0 Firefox/140.0', // Mobile Firefox UA
        hasTouch: true,
        // Note: isMobile is not supported in Firefox, so we simulate mobile with viewport + UA
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true, // Always reuse existing server to avoid port conflicts
    timeout: 120 * 1000,
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_API_URL: 'http://localhost:3000'
    },
  },
});
