// This file configures the initialization of Sentry on the client side.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Prevent multiple initializations
if (typeof window !== "undefined" && !(window as any).__sentryInitialized) {
  (window as any).__sentryInitialized = true;

  // Determine environment
  const environment = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development";
  const isDevelopment = environment === "development";
  const isProduction = environment === "production";

  Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://3e013eea839f1016a4d06f3ec78d1407@o4509932462800896.ingest.de.sentry.io/4509932479250512",

  // Environment configuration
  environment,

  // Release tracking - uses VERCEL_GIT_COMMIT_SHA in production
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "unknown",

  // Performance monitoring - Adjust sample rate based on environment
  tracesSampleRate: isProduction ? 0.1 : 1.0,

  // Session Replay - Disabled in development to avoid conflicts, enabled in production
  replaysSessionSampleRate: isProduction ? 0.1 : 0,
  replaysOnErrorSampleRate: isProduction ? 1.0 : 0,

  // Integrations
  integrations: [
    ...(isProduction ? [
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
    ] : []),
    Sentry.browserTracingIntegration(),
  ],

  // Transport options
  transportOptions: {
    // Use tunnel to bypass ad-blockers
    tunnel: "/monitoring",
  },

  // Debug mode only in development
  debug: isDevelopment,

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
}