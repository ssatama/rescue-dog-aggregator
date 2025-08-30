// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Determine environment
const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
const isDevelopment = environment === "development";
const isProduction = environment === "production";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "https://3e013eea839f1016a4d06f3ec78d1407@o4509932462800896.ingest.de.sentry.io/4509932479250512",

  // Environment configuration
  environment,

  // Release tracking
  release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || "unknown",

  // Performance monitoring - 100% sampling for low-traffic site (15 visitors/day)
  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry (only errors in production)
  enableLogs: true,

  // Debug mode only in development
  debug: isDevelopment,

  // Integrations (profiling only available in Node.js runtime)
  integrations: [],

  // Ignore certain errors
  ignoreErrors: [
    // Ignore client-side errors that somehow reach the server
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],

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
