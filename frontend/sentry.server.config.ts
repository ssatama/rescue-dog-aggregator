// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Determine environment
const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
const isDevelopment = environment === "development";
const isProduction = environment === "production";

// ONLY initialize Sentry in production
if (isProduction) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Environment configuration
    environment,

    // Release tracking
    release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || "unknown",

    // Performance monitoring - 100% sampling for low-traffic site (15 visitors/day)
    tracesSampleRate: 1.0,

    // Session replay not applicable on server - explicitly set to 0
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Enable logs to be sent to Sentry (only errors in production)
    enableLogs: true,

    // Explicit security setting
    sendDefaultPii: false,

    // Debug mode disabled (non-debug bundle in use)
    // debug: isDevelopment,

    // Integrations for server-side
    integrations: [
      Sentry.httpIntegration(),
      Sentry.nativeNodeFetchIntegration(),
    ],

    // Ignore certain errors
    ignoreErrors: [
      // Ignore client-side errors that somehow reach the server
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
    ],

    // Breadcrumb configuration
    maxBreadcrumbs: 50,

    // Data scrubbing
    beforeSend(event, hint) {
      // In development, always send events
      if (isDevelopment) {
        return event;
      }

      // Add server context
      event.contexts = {
        ...event.contexts,
        runtime: {
          name: "node",
          version: process.version,
        },
      };

      // Add server tags
      event.tags = {
        ...event.tags,
        "server.region": process.env.VERCEL_REGION || "unknown",
        "deployment.type": process.env.VERCEL ? "vercel" : "local",
      };

      // Scrub sensitive headers
      if (event.request?.headers) {
        const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
        sensitiveHeaders.forEach(header => {
          if (event.request?.headers?.[header]) {
            event.request.headers[header] = "[REDACTED]";
          }
        });
      }

      return event;
    },

    // Set initial scope
    initialScope: {
      tags: {
        component: "backend",
        runtime: "nodejs",
      },
    },
  });
} else {
  console.log(`Sentry disabled for ${environment} environment - only enabled in production`);
}