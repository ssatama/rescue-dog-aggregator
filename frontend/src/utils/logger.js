/**
 * Development-only logging utility
 * Provides conditional logging that only outputs in development environment
 */

import * as Sentry from "@sentry/nextjs";

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  error: (...args) => {
    if (isDevelopment) {
      console.error(...args);
    }
  },

  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

// Production error reporting with Sentry integration
export const reportError = (error, context = {}) => {
  if (isDevelopment) {
    console.error("Error:", error, "Context:", context);
  } else {
    // In production, report to Sentry
    try {
      // Preserve original error object to maintain stack traces
      const errorToReport = error instanceof Error ? error : new Error(String(error));
      
      Sentry.captureException(errorToReport, { 
        extra: context,
        tags: {
          source: 'frontend_api',
          browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        }
      });
    } catch (sentryError) {
      // Fallback to console if Sentry fails
      console.error("Sentry reporting failed:", sentryError);
      console.error("Original error:", error, "Context:", context);
    }
  }
};