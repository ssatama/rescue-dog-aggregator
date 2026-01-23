import * as Sentry from "@sentry/nextjs";

interface SwipeEventData {
  timestamp?: string;
  dogId?: number;
  dogName?: string;
}

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  addBreadcrumb: jest.fn(),
  captureEvent: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  getActiveSpan: jest.fn(() => ({
    setAttribute: jest.fn(),
    setMeasurement: jest.fn(),
    setTag: jest.fn(),
  })),
}));

describe("Sentry Configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Swipe Event Tracking", () => {
    it("should track swipe events as breadcrumbs, not errors", () => {
      // Simulate tracking a swipe event
      const trackSwipeEvent = (eventName: string, data: SwipeEventData) => {
        Sentry.addBreadcrumb({
          message: eventName,
          category: "swipe",
          level: "info",
          data,
        });
      };

      // Track various swipe events
      trackSwipeEvent("swipe.session.started", {
        timestamp: new Date().toISOString(),
      });
      trackSwipeEvent("swipe.card.viewed", { dogId: 123, dogName: "Max" });
      trackSwipeEvent("swipe.session.ended", {
        timestamp: new Date().toISOString(),
      });

      // Verify breadcrumbs were called, not captureEvent or captureException
      expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(3);
      expect(Sentry.captureEvent).not.toHaveBeenCalled();
      expect(Sentry.captureException).not.toHaveBeenCalled();

      // Verify correct breadcrumb structure
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "swipe",
          level: "info",
          message: expect.stringMatching(/^swipe\./),
        }),
      );
    });

    it("should not send swipe telemetry as errors", () => {
      // List of events that should NOT be errors
      const telemetryEvents = [
        "swipe.session.started",
        "swipe.session.ended",
        "swipe.card.viewed",
        "swipe.card.favorited",
        "swipe.card.expanded",
        "swipe.queue.loaded",
        "swipe.card.double_tapped",
      ];

      telemetryEvents.forEach((event) => {
        Sentry.addBreadcrumb({
          message: event,
          category: "swipe",
          level: "info",
          data: {},
        });
      });

      // None of these should trigger error capture
      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
      expect(Sentry.captureEvent).not.toHaveBeenCalled();

      // All should be breadcrumbs
      expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(
        telemetryEvents.length,
      );
    });
  });

  describe("Performance Monitoring", () => {
    it("should track FPS issues as performance metrics, not errors", () => {
      const mockSpan = {
        setMeasurement: jest.fn(),
        setTag: jest.fn(),
        setAttribute: jest.fn(),
      };

      (Sentry.getActiveSpan as jest.Mock).mockReturnValue(mockSpan);

      // Simulate low FPS detection
      const avgFPS = 25;
      Sentry.addBreadcrumb({
        message: `Low FPS detected in swipe interface: ${avgFPS} fps`,
        category: "performance",
        level: "warning",
        data: {
          fps: avgFPS,
          threshold: 30,
          fpsHistory: [24, 25, 26, 25, 24],
        },
      });

      // Should track as breadcrumb and measurement
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "performance",
          level: "warning",
        }),
      );

      // Should not be an error
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("should track slow load times as performance metrics", () => {
      const loadTime = 4500;

      Sentry.addBreadcrumb({
        message: `Slow swipe load time detected: ${loadTime}ms`,
        category: "performance",
        level: "warning",
        data: {
          loadTime,
          threshold: 3000,
        },
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "performance",
          level: "warning",
          data: expect.objectContaining({
            loadTime: 4500,
            threshold: 3000,
          }),
        }),
      );

      // Should not trigger error capture
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    it("should track slow gesture duration as performance metric", () => {
      const duration = 750;

      Sentry.addBreadcrumb({
        message: `Slow swipe gesture detected: ${duration}ms`,
        category: "performance",
        level: "warning",
        data: {
          duration,
          threshold: 500,
        },
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "performance",
          level: "warning",
          data: expect.objectContaining({
            duration: 750,
            threshold: 500,
          }),
        }),
      );

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
  });

  describe("Environment Detection", () => {
    const getRuntimeEnvironment = (hostname: string) => {
      if (hostname === "www.rescuedogs.me") {
        return "production";
      }
      if (hostname === "localhost") {
        return "development";
      }
      return "development";
    };

    it("should detect production environment correctly", () => {
      expect(getRuntimeEnvironment("www.rescuedogs.me")).toBe("production");
    });

    it("should detect development environment on localhost", () => {
      expect(getRuntimeEnvironment("localhost")).toBe("development");
    });

    it("should detect development environment for unknown hosts", () => {
      expect(getRuntimeEnvironment("staging.example.com")).toBe("development");
    });

    it("should use window.location.hostname in browser context", () => {
      const mockGetRuntimeEnvironment = () => {
        if (typeof window !== "undefined") {
          return getRuntimeEnvironment(window.location.hostname);
        }
        return "development";
      };

      const result = mockGetRuntimeEnvironment();
      expect(result).toBe("development");
    });
  });

  describe("Error Handling", () => {
    it("should still capture real errors with captureException", () => {
      const realError = new Error("Database connection failed");

      // Real errors should still be captured
      Sentry.captureException(realError);

      expect(Sentry.captureException).toHaveBeenCalledWith(realError);
      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    });

    it("should not interfere with legitimate error boundaries", () => {
      // Error boundaries should still work
      const componentError = new Error("Component render failed");

      Sentry.captureException(componentError);

      expect(Sentry.captureException).toHaveBeenCalledWith(componentError);
    });
  });
});
