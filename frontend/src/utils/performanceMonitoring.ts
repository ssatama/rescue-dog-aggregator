import * as Sentry from "@sentry/nextjs";

/**
 * Initialize Web Vitals monitoring for the entire application
 * Tracks Core Web Vitals: LCP, FID, CLS, FCP, TTFB
 */
export function initWebVitals() {
  if (typeof window === "undefined") return;

  // Track Web Vitals
  if ("PerformanceObserver" in window) {
    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as any;

        Sentry.startSpan(
          {
            name: "web-vitals.lcp",
            op: "ui.webvitals.lcp",
            attributes: {
              "lcp.value": lastEntry.renderTime || lastEntry.loadTime,
              "lcp.element": lastEntry.element?.tagName,
              "lcp.url": lastEntry.url,
            },
          },
          () => {},
        );
      });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
    } catch (e) {
      Sentry.captureException(e, {
        tags: { component: "performance-observer", type: "lcp" },
      });
      console.warn("LCP observer failed:", e);
    }

    // First Input Delay (FID) / Interaction to Next Paint (INP)
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          Sentry.startSpan(
            {
              name: "web-vitals.fid",
              op: "ui.webvitals.fid",
              attributes: {
                "fid.value": entry.processingStart - entry.startTime,
                "fid.name": entry.name,
              },
            },
            () => {},
          );
        });
      });
      fidObserver.observe({ entryTypes: ["first-input"] });
    } catch (e) {
      Sentry.captureException(e, {
        tags: { component: "performance-observer", type: "fid" },
      });
      console.warn("FID observer failed:", e);
    }

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    let clsEntries: any[] = [];

    try {
      const clsObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);
          }
        });

        // Report CLS periodically
        Sentry.startSpan(
          {
            name: "web-vitals.cls",
            op: "ui.webvitals.cls",
            attributes: {
              "cls.value": clsValue,
              "cls.entries": clsEntries.length,
            },
          },
          () => {},
        );
      });
      clsObserver.observe({ entryTypes: ["layout-shift"] });
    } catch (e) {
      Sentry.captureException(e, {
        tags: { component: "performance-observer", type: "cls" },
      });
      console.warn("CLS observer failed:", e);
    }
  }

  // Track page navigation performance
  if (window.performance && window.performance.timing) {
    const timing = window.performance.timing;
    const navigationStart = timing.navigationStart;

    window.addEventListener("load", () => {
      setTimeout(() => {
        try {
          const pageLoadTime = timing.loadEventEnd - navigationStart;
          const domContentLoadedTime =
            timing.domContentLoadedEventEnd - navigationStart;
          const ttfb = timing.responseStart - navigationStart;

          Sentry.startSpan(
            {
              name: "page.load",
              op: "navigation",
              attributes: {
                "page.load_time": pageLoadTime,
                "page.dom_content_loaded": domContentLoadedTime,
                "page.ttfb": ttfb,
                "page.url": window.location.pathname,
              },
            },
            () => {},
          );
        } catch (e) {
          Sentry.captureException(e, {
            tags: { component: "performance-observer", type: "navigation" },
          });
          console.warn("Navigation timing failed:", e);
        }
      }, 0);
    });
  }
}

/**
 * Track API call performance with automatic error handling
 */
export function trackApiCall<T>(
  url: string,
  method: string,
  operation: () => Promise<T>,
): Promise<T> {
  return Sentry.startSpan(
    {
      name: `${method} ${url}`,
      op: "http.client",
      attributes: {
        "http.method": method,
        "http.url": url,
      },
    },
    async (span) => {
      try {
        const startTime = performance.now();
        const result = await operation();
        const duration = performance.now() - startTime;

        span.setAttribute("http.duration", duration);
        span.setStatus({ code: 1 }); // OK

        // Alert on slow API calls
        if (duration > 3000) {
          Sentry.addBreadcrumb({
            category: "api.performance",
            message: `Slow API call: ${method} ${url}`,
            level: "warning",
            data: { duration, url, method },
          });
        }

        return result;
      } catch (error) {
        span.setStatus({ code: 2 }); // ERROR
        span.setAttribute("http.error", true);

        // Capture API errors
        Sentry.withScope((scope) => {
          scope.setContext("api_call", {
            url,
            method,
            error: error instanceof Error ? error.message : String(error),
          });
          Sentry.captureException(error);
        });

        throw error;
      }
    },
  );
}

/**
 * Track user interactions with performance metrics
 */
export function trackInteraction(
  name: string,
  category: string,
  operation: () => void | Promise<void>,
) {
  return Sentry.startSpan(
    {
      name: `interaction.${name}`,
      op: `ui.interaction.${category}`,
      attributes: {
        "interaction.name": name,
        "interaction.category": category,
      },
    },
    async () => {
      const startTime = performance.now();

      try {
        await operation();

        const duration = performance.now() - startTime;

        // Track slow interactions
        if (duration > 1000) {
          Sentry.addBreadcrumb({
            category: "ui.performance",
            message: `Slow interaction: ${name}`,
            level: "warning",
            data: { duration, name, category },
          });
        }
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
  );
}

/**
 * Track React component render performance
 */
export function trackComponentRender(componentName: string) {
  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;

    if (duration > 16) {
      // More than 1 frame (60fps)
      Sentry.addBreadcrumb({
        category: "react.performance",
        message: `Slow render: ${componentName}`,
        level: "info",
        data: { duration, componentName },
      });
    }
  };
}

/**
 * Initialize all performance monitoring
 */
export function initPerformanceMonitoring() {
  // Initialize Web Vitals tracking
  initWebVitals();

  // Track route changes (for Next.js)
  if (typeof window !== "undefined") {
    const handleRouteChange = (url: string) => {
      Sentry.addBreadcrumb({
        category: "navigation",
        message: `Route changed to ${url}`,
        level: "info",
        data: { url },
      });
    };

    // Listen to route changes
    window.addEventListener("popstate", () => {
      handleRouteChange(window.location.pathname);
    });
  }

  // Track memory usage periodically
  if (
    typeof window !== "undefined" &&
    "performance" in window &&
    "memory" in (performance as any)
  ) {
    setInterval(() => {
      const memory = (performance as any).memory;

      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
        Sentry.captureMessage("High memory usage detected", "warning");
      }

      Sentry.addBreadcrumb({
        category: "performance.memory",
        message: "Memory snapshot",
        level: "debug",
        data: {
          usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1048576), // MB
          totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1048576), // MB
          jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
        },
      });
    }, 60000); // Every minute
  }
}
