import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from "web-vitals";
import { logger } from "./logger";

interface PerformanceData {
  metric: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta?: number;
  navigationType?: string;
  url: string;
  timestamp: number;
  deviceType: "mobile" | "tablet" | "desktop";
  connectionType?: string;
}

// Thresholds based on Google's Core Web Vitals
const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint
};

function getRating(
  metric: string,
  value: number,
): "good" | "needs-improvement" | "poor" {
  const threshold = THRESHOLDS[metric];
  if (!threshold) return "needs-improvement";

  if (value <= threshold.good) return "good";
  if (value > threshold.poor) return "poor";
  return "needs-improvement";
}

function getDeviceType(): "mobile" | "tablet" | "desktop" {
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: string;
  };
}

function getConnectionType(): string | undefined {
  const nav = navigator as NavigatorWithConnection;
  return nav.connection?.effectiveType;
}

function sendToAnalytics(data: PerformanceData) {
  // Log locally for development
  if (process.env.NODE_ENV === "development") {
    const emoji =
      data.rating === "good" ? "✅" : data.rating === "poor" ? "❌" : "⚠️";
    console.log(
      `${emoji} ${data.metric}: ${data.value.toFixed(2)}ms (${data.rating})`,
    );
  }

  // Send to analytics service
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "web_vitals", {
      event_category: "Performance",
      event_label: data.metric,
      value: Math.round(data.value),
      metric_rating: data.rating,
      device_type: data.deviceType,
      connection_type: data.connectionType,
      non_interaction: true,
    });
  }

  // Send to custom analytics endpoint
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch((err) => {
      logger.error("Failed to send performance metrics", err);
    });
  }

  // Log to application logger
  logger.info("Performance metric captured", data);
}

function handleMetric(metric: Metric) {
  const data: PerformanceData = {
    metric: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    delta: metric.delta,
    navigationType: metric.navigationType,
    url: window.location.href,
    timestamp: Date.now(),
    deviceType: getDeviceType(),
    connectionType: getConnectionType(),
  };

  sendToAnalytics(data);
}

// Initialize performance monitoring
export function initPerformanceMonitoring() {
  if (typeof window === "undefined") return;

  // Core Web Vitals
  onFCP(handleMetric); // First Contentful Paint
  onLCP(handleMetric); // Largest Contentful Paint
  onCLS(handleMetric); // Cumulative Layout Shift
  onTTFB(handleMetric); // Time to First Byte
  onINP(handleMetric); // Interaction to Next Paint

  // Custom performance marks
  if (window.performance && window.performance.mark) {
    // Mark when React hydration completes
    if (document.readyState === "complete") {
      window.performance.mark("react-hydration-complete");
    } else {
      window.addEventListener("load", () => {
        window.performance.mark("react-hydration-complete");
      });
    }
  }

  // Monitor long tasks
  if ("PerformanceObserver" in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            // Tasks longer than 50ms
            logger.warn("Long task detected", {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
            });
          }
        }
      });
      observer.observe({ entryTypes: ["longtask"] });
    } catch (e) {
      // PerformanceObserver not supported
    }
  }

  // Monitor resource loading
  if (window.performance && window.performance.getEntriesByType) {
    window.addEventListener("load", () => {
      const resources = window.performance.getEntriesByType("resource");
      const slowResources = resources.filter((r) => r.duration > 1000);

      if (slowResources.length > 0) {
        logger.warn("Slow resources detected", {
          count: slowResources.length,
          resources: slowResources.map((r) => ({
            name: r.name,
            duration: Math.round(r.duration),
            type: (r as PerformanceResourceTiming).initiatorType,
          })),
        });
      }
    });
  }
}

// Export individual metric functions for manual tracking
export function trackCustomMetric(
  name: string,
  value: number,
  metadata?: Partial<
    Pick<PerformanceData, "delta" | "navigationType" | "connectionType">
  > &
    Record<string, string | number | boolean | undefined>,
) {
  const data: PerformanceData = {
    metric: name,
    value,
    rating: getRating(name, value),
    url: window.location.href,
    timestamp: Date.now(),
    deviceType: getDeviceType(),
    connectionType: getConnectionType(),
    ...metadata,
  };

  sendToAnalytics(data);
}

// Helper to measure component render time
export function measureComponentPerformance(componentName: string) {
  const startMark = `${componentName}-start`;
  const endMark = `${componentName}-end`;
  const measureName = `${componentName}-render`;

  return {
    start: () => {
      if (window.performance && window.performance.mark) {
        window.performance.mark(startMark);
      }
    },
    end: () => {
      if (
        window.performance &&
        window.performance.mark &&
        window.performance.measure
      ) {
        window.performance.mark(endMark);
        window.performance.measure(measureName, startMark, endMark);

        const entries = window.performance.getEntriesByName(measureName);
        if (entries.length > 0) {
          const duration = entries[entries.length - 1].duration;
          trackCustomMetric(`component-render-${componentName}`, duration);
        }
      }
    },
  };
}

// Utility to track API call performance
export function trackAPIPerformance(endpoint: string, startTime: number) {
  const duration = Date.now() - startTime;
  trackCustomMetric("api-call-duration", duration, {
    endpoint,
    rating:
      duration < 200 ? "good" : duration < 1000 ? "needs-improvement" : "poor",
  });
}

declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      params?: Record<string, string | number | boolean | undefined>,
    ) => void;
  }
}
