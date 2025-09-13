// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Determine environment early for logging decisions
const getRuntimeEnvironment = () => {
  // Check if we're on production domain
  if (
    typeof window !== "undefined" &&
    window.location.hostname === "www.rescuedogs.me"
  ) {
    return "production";
  }
  // Check Vercel environment variable
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
    return "production";
  }
  // Check if we're on localhost
  if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost"
  ) {
    return "development";
  }
  // Fallback to NODE_ENV
  return process.env.NODE_ENV || "development";
};

const environment = getRuntimeEnvironment();

const isDevelopment = environment === "development";
const isProduction = environment === "production";

// Only log in development mode
if (isDevelopment) {
  console.log("[Sentry] Client instrumentation file loaded");
}

// ONLY initialize Sentry in production
if (
  isProduction &&
  typeof window !== "undefined" &&
  !(window as any).__sentryInitialized
) {
  // Prevent multiple initializations in production
  (window as any).__sentryInitialized = true;

  // Only log initialization in development mode
  if (isDevelopment) {
    console.log("[Sentry] Initializing Sentry in client-side mode");
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Environment configuration
    environment,

    // Release tracking - uses VERCEL_GIT_COMMIT_SHA in production
    release:
      process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      "unknown",

    // Performance monitoring - 100% sampling for low-traffic site (15 visitors/day)
    tracesSampleRate: 1.0,

    // Session Replay - Disabled in development to avoid conflicts, 100% in production for better debugging
    replaysSessionSampleRate: isProduction ? 1.0 : 0,
    replaysOnErrorSampleRate: isProduction ? 1.0 : 0,

    // Integrations
    integrations: [
      ...(isProduction
        ? [
            Sentry.replayIntegration({
              maskAllText: false,
              blockAllMedia: false,
              // Mask sensitive selectors
              mask: [
                "input[type=password]",
                "input[type=email]",
                "input[type=tel]",
                "[data-sensitive]",
              ],
            }),
          ]
        : []),
      Sentry.browserTracingIntegration(),
    ],

    // Transport options
    transportOptions: {
      // Use tunnel to bypass ad-blockers
      tunnel: "/monitoring",
    },

    // Debug mode disabled (non-debug bundle in use)
    // debug: isDevelopment,

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      // Network errors
      "Network request failed",
      "NetworkError",
      "Failed to fetch",
      // Common browser errors
      "Non-Error promise rejection captured",
    ],

    // Data scrubbing and filtering
    beforeSend(event, hint) {
      // In development, always send events
      if (isDevelopment) {
        return event;
      }

      // Filter out specific errors in production
      const error = hint.originalException as Error;

      // Don't send cancelled fetch requests
      if (error?.name === "AbortError") {
        return null;
      }

      // Add user context
      if (typeof window !== "undefined") {
        event.contexts = {
          ...event.contexts,
          browser: {
            ...event.contexts?.browser,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
          },
          screen: {
            width: window.screen.width,
            height: window.screen.height,
            pixel_ratio: window.devicePixelRatio,
          },
        };

        // Add user preferences
        event.tags = {
          ...event.tags,
          "ui.theme": localStorage.getItem("theme") || "light",
          "ui.language": navigator.language,
          "device.online": navigator.onLine,
        };
      }

      // Scrub sensitive data from URLs
      if (event.request?.url) {
        const url = new URL(event.request.url);
        // Remove any auth tokens from query params
        url.searchParams.delete("token");
        url.searchParams.delete("key");
        url.searchParams.delete("api_key");
        event.request.url = url.toString();
      }

      return event;
    },

    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === "console" && breadcrumb.level === "debug") {
        return null;
      }

      // Don't track certain XHR requests
      if (breadcrumb.category === "xhr" || breadcrumb.category === "fetch") {
        const url = breadcrumb.data?.url;
        if (url?.includes("/api/health") || url?.includes("/_next/")) {
          return null;
        }
      }

      // Enhance navigation breadcrumbs
      if (breadcrumb.category === "navigation") {
        breadcrumb.data = {
          ...breadcrumb.data,
          timestamp: new Date().toISOString(),
        };
      }

      return breadcrumb;
    },

    // Set user identification
    initialScope: {
      tags: {
        component: "frontend",
      },
    },
  });

  // Set initial user context if available
  // Track viewport changes
  let resizeTimeout: NodeJS.Timeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      Sentry.setContext("viewport", {
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, 500);
  });

  // Track online/offline status
  window.addEventListener("online", () => {
    Sentry.addBreadcrumb({
      category: "device",
      message: "Device came online",
      level: "info",
    });
  });

  window.addEventListener("offline", () => {
    Sentry.addBreadcrumb({
      category: "device",
      message: "Device went offline",
      level: "warning",
    });
  });

  // Track theme changes
  const trackThemeChange = () => {
    const theme = localStorage.getItem("theme") || "light";
    Sentry.setTag("ui.theme", theme);
  };

  window.addEventListener("storage", (e) => {
    if (e.key === "theme") {
      trackThemeChange();
    }
  });
} else if (!isProduction && isDevelopment) {
  console.log(
    `[Sentry] Disabled for ${environment} environment - only enabled in production`,
  );
}

// Export for router transition tracking - no-op in non-production
export const onRouterTransitionStart = isProduction
  ? Sentry.captureRouterTransitionStart
  : () => {};
