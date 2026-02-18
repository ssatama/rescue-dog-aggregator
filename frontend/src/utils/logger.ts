import * as Sentry from "@sentry/nextjs";

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  log: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  error: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.error(...args);
    }
  },

  warn: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  info: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

export const reportError = (error: unknown, context: Record<string, unknown> = {}): void => {
  if (isDevelopment) {
    console.error("Error:", error, "Context:", context);
  } else {
    try {
      const errorToReport =
        error instanceof Error ? error : new Error(String(error), { cause: error });

      Sentry.captureException(errorToReport, {
        extra: context,
        tags: {
          source: "frontend_api",
          browser:
            typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        },
      });
    } catch (sentryError) {
      console.error("Sentry reporting failed:", sentryError);
      console.error("Original error:", error, "Context:", context);
    }
  }
};
