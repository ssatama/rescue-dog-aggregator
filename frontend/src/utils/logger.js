/**
 * Development-only logging utility
 * Provides conditional logging that only outputs in development environment
 */

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

// For production error reporting, you might want to integrate with a service like Sentry
export const reportError = (error, context = {}) => {
  if (isDevelopment) {
    console.error("Error:", error, "Context:", context);
  } else {
    // In production, you would send to error tracking service
    // Example: Sentry.captureException(error, { extra: context });
  }
};
