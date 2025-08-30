// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://3e013eea839f1016a4d06f3ec78d1407@o4509932462800896.ingest.de.sentry.io/4509932479250512",

  // Set environment
  environment: process.env.NODE_ENV || "development",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Capture all traces since we have low traffic
  tracesSampleRate: 1.0,

  // Capture all sessions since we have low traffic
  replaysSessionSampleRate: 1.0,

  // Always capture replays when errors occur
  replaysOnErrorSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Breadcrumb configuration for user behavior tracking
  maxBreadcrumbs: 50, // Keep last 50 breadcrumbs (enough context without excess)

  // Filter breadcrumbs to reduce noise
  beforeBreadcrumb(breadcrumb) {
    // Filter out noisy console breadcrumbs unless they're errors
    if (breadcrumb.category === "console" && breadcrumb.level !== "error") {
      return null;
    }

    // Filter out very frequent navigation breadcrumbs from Next.js internals
    if (
      breadcrumb.category === "navigation" &&
      breadcrumb.data?.to?.includes("_next")
    ) {
      return null;
    }

    // Keep all ui and navigation breadcrumbs (our custom tracking)
    if (breadcrumb.category === "ui" || breadcrumb.category === "navigation") {
      return breadcrumb;
    }

    // Keep error and warning breadcrumbs
    if (breadcrumb.level === "error" || breadcrumb.level === "warning") {
      return breadcrumb;
    }

    // Keep fetch/XHR breadcrumbs for API tracking
    if (breadcrumb.category === "fetch" || breadcrumb.category === "xhr") {
      return breadcrumb;
    }

    // Default: keep the breadcrumb
    return breadcrumb;
  },

  // Initialize user context
  initialScope: {
    contexts: {
      user_preferences: {
        language:
          typeof navigator !== "undefined" ? navigator.language : "unknown",
        timezone:
          typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : "unknown",
        colorScheme:
          typeof window !== "undefined" && window.matchMedia
            ? window.matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light"
            : "unknown",
      },
      device: {
        screen_width:
          typeof window !== "undefined" ? window.screen?.width : undefined,
        screen_height:
          typeof window !== "undefined" ? window.screen?.height : undefined,
        viewport_width:
          typeof window !== "undefined" ? window.innerWidth : undefined,
        viewport_height:
          typeof window !== "undefined" ? window.innerHeight : undefined,
        pixel_ratio:
          typeof window !== "undefined" ? window.devicePixelRatio : undefined,
        platform:
          typeof navigator !== "undefined" ? navigator.platform : "unknown",
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      },
    },
  },
});

// Update context when viewport changes
if (typeof window !== "undefined") {
  window.addEventListener("resize", () => {
    Sentry.setContext("device", {
      screen_width: window.screen?.width,
      screen_height: window.screen?.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      pixel_ratio: window.devicePixelRatio,
      platform: navigator.platform,
      user_agent: navigator.userAgent,
    });
  });

  // Update context when color scheme changes
  if (window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        Sentry.setContext("user_preferences", {
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          colorScheme: e.matches ? "dark" : "light",
        });
      });
  }
}

// Export for router transition tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
