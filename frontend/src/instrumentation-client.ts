// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import { resolvePosthogOptOut } from "@/lib/posthogOptOut";
import {
  isChunkLoadError,
  setupChunkErrorHandler,
} from "@/lib/chunkLoadError";
import { logger } from "@/utils/logger";

// Extend Window interface for Sentry initialization tracking
declare global {
  interface Window {
    __sentryInitialized?: boolean;
  }
}

// Determine environment - simplified to use Vercel's provided env vars
const environment =
  process.env.NEXT_PUBLIC_VERCEL_ENV ||
  process.env.NODE_ENV ||
  "development";

const isDevelopment = environment === "development";
const isProduction = environment === "production";
const isPreview = environment === "preview";

logger.log("[Sentry] Client instrumentation file loaded");

// PostHog product analytics. Production only, so previews and local builds
// don't pollute the numbers; `?debug=posthog` enables it anywhere for testing.
// `?posthog_optout=1` permanently excludes this browser (see posthogOptOut.ts).
//
// `window.localStorage` is read inside a try because Safari with strict privacy
// throws on the property access itself, and a throw here would take Sentry
// init down with it.
let posthogStorage: Storage | null = null;
try {
  posthogStorage = window.localStorage;
} catch {
  // Blocked storage: the opt-out cannot be read, so capture as normal.
}
let posthogInitError: unknown = null;
let posthogEnabled =
  typeof window !== "undefined" &&
  !!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
  (isProduction || window.location.search.includes("debug=posthog")) &&
  !resolvePosthogOptOut(window.location.search, posthogStorage);

// Guarded so a PostHog failure can never stop Sentry from starting below.
if (posthogEnabled) {
  try {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
      // PostHog-managed reverse proxy (CNAME to PostHog EU), so ad blockers
      // don't drop events. It also serves the replay recorder script.
      api_host: "https://e.rescuedogs.me",
      ui_host: "https://eu.posthog.com",
      // Pageviews on App Router navigations via the history API, plus current
      // recommended defaults for everything else.
      defaults: "2026-08-30",
      // No cookies, no localStorage: the privacy page promises no cookies and
      // there is no consent banner. The cost is that a full page reload starts
      // a new anonymous visitor, so unique-visitor counts run high. We don't use
      // `cookieless_mode: "always"` because it doesn't record session replays.
      persistence: "memory",
      // Sentry owns errors; the sentryIntegration below links the two.
      capture_exceptions: false,
      // The recorder bundle is large, so it starts once the page is idle
      // (below), keeping it off the critical path for LCP.
      disable_session_recording: true,
    });

    const startRecording = () => {
      try {
        posthog.startSessionRecording();
      } catch {
        // Replays are best effort; a blocked recorder script is not a bug.
      }
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(startRecording, { timeout: 2000 });
    } else {
      setTimeout(startRecording, 2000);
    }
  } catch (error) {
    posthogEnabled = false;
    posthogInitError = error;
  }
}

// Initialize Sentry in production and preview environments
if (
  (isProduction || isPreview) &&
  typeof window !== "undefined" &&
  !window.__sentryInitialized
) {
  // Prevent multiple initializations
  window.__sentryInitialized = true;

  logger.log("[Sentry] Initializing Sentry in client-side mode");

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Environment configuration
    environment,

    // Release tracking - uses VERCEL_GIT_COMMIT_SHA in production
    release:
      process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      "unknown",

    // Performance sampling: 100% pageloads (web vitals), 10% everything else
    tracesSampler: (samplingContext) => {
      const op = samplingContext.attributes?.["sentry.op"];
      if (op === "pageload") return 1.0;
      return 0.1;
    },

    // Enable distributed tracing to backend API
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/.*\.rescuedogs\.me/,
      /^https:\/\/api\.rescuedogs\.me/,
    ],

    // Session Replay - errors only. PostHog records every session, and the
    // posthog.sentryIntegration below links a Sentry issue to that replay.
    replaysSessionSampleRate: 0,
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
      // Tags each Sentry event with the PostHog person and session URL.
      // Exceptions are not copied into PostHog: Sentry stays the error tracker.
      ...(posthogEnabled
        ? [posthog.sentryIntegration({ sendExceptionsToPostHog: false })]
        : []),
    ],

    // Note: tunnelRoute in next.config.js handles tunnel - no transportOptions needed

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
      // Chunk load errors (handled separately with auto-reload)
      "Loading chunk",
      "ChunkLoadError",
      /e\[n\]\.call/,
      /e\[n\] is not a function/,
      /undefined is not an object.*e\[n\]/,
      /module factory is not available/i,
    ],

    // Data scrubbing and filtering
    beforeSend(event, hint) {
      // Filter out chunk load errors - these are handled by auto-reload
      const error = hint.originalException;
      if (isChunkLoadError(error)) {
        return null;
      }

      // In development, always send events
      if (isDevelopment) {
        return event;
      }

      // Filter out specific errors in production
      const errorObj = hint.originalException as Error;

      // Don't send cancelled fetch requests
      if (errorObj?.name === "AbortError") {
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

  if (posthogInitError) {
    Sentry.captureException(posthogInitError, {
      tags: { component: "posthog-init" },
    });
  }

  // Setup chunk error handler for auto-reload on stale chunks
  setupChunkErrorHandler();
} else {
  logger.log(
    `[Sentry] Disabled for ${environment} environment - only enabled in production`,
  );
}

// Export for router transition tracking - always export the function
// Sentry SDK handles non-production gracefully internally
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
