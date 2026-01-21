import * as Sentry from "@sentry/nextjs";
import { SwipeMetrics, testHelpers } from "../swipeMetrics";

interface MockSpan {
  setAttribute: jest.Mock;
  setAttributes: jest.Mock;
  end: jest.Mock;
}

interface MockPerformance {
  now: jest.Mock;
  mark: jest.Mock;
  measure: jest.Mock;
  getEntriesByName: jest.Mock;
}

interface SpanOptions {
  name: string;
  op?: string;
  attributes?: Record<string, unknown>;
}

interface MockSentry {
  startSpan: jest.Mock<unknown, [SpanOptions, ((span: MockSpan) => unknown)?]>;
  addBreadcrumb: jest.Mock;
  captureMessage: jest.Mock;
  captureEvent: jest.Mock;
  getCurrentScope: jest.Mock;
}

jest.mock("@sentry/nextjs", () => ({
  startSpan: jest.fn((options, callback) => {
    const span = {
      setAttribute: jest.fn(),
      setAttributes: jest.fn(),
      end: jest.fn(),
    };
    if (callback) {
      return callback(span);
    }
    return span;
  }),
  addBreadcrumb: jest.fn(),
  captureMessage: jest.fn(),
  captureEvent: jest.fn(),
  getCurrentScope: jest.fn(() => ({})),
}));

const mockSentry = Sentry as unknown as MockSentry;

describe("SwipeMetrics", () => {
  let metrics: SwipeMetrics;
  let performanceMock: MockPerformance;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();

    // Save original NODE_ENV and set to production to ensure events are sent
    originalNodeEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      writable: true,
      configurable: true,
    });

    // Ensure window is defined for isSentryReady check
    global.window = {} as Window & typeof globalThis;

    metrics = new SwipeMetrics();

    performanceMock = {
      now: jest.fn().mockReturnValue(1000),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByName: jest.fn().mockReturnValue([{ duration: 100 }]),
    };

    global.performance = performanceMock as unknown as Performance;
  });

  afterEach(() => {
    // Restore original NODE_ENV
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalNodeEnv,
      writable: true,
      configurable: true,
    });
    jest.restoreAllMocks();
  });

  describe("Helper function validation", () => {
    it("shouldSendEvents should return true in production", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
        configurable: true,
      });
      expect(testHelpers.shouldSendEvents()).toBe(true);
    });

    it("isSentryReady should detect our mock", () => {
      global.window = {} as Window & typeof globalThis;
      const isReady = testHelpers.isSentryReady();
      console.log("isSentryReady result:", isReady);
      console.log("Sentry object:", Sentry);
      console.log("Sentry.startSpan type:", typeof Sentry.startSpan);
      console.log(
        "Sentry.getCurrentScope type:",
        typeof Sentry.getCurrentScope,
      );

      // This might fail, but let's see what happens
      expect(isReady).toBe(true);
    });
  });

  describe("Sentry mock validation", () => {
    it("should have all required Sentry methods", () => {
      expect(Sentry).toBeDefined();
      expect(typeof Sentry.startSpan).toBe("function");
      expect(typeof Sentry.getCurrentScope).toBe("function");
      expect(Sentry.getCurrentScope()).toBeDefined();
      expect(typeof Sentry.addBreadcrumb).toBe("function");
    });

    it("should satisfy isSentryReady checks", () => {
      // Check all conditions that isSentryReady verifies
      expect(typeof window).not.toBe("undefined");
      expect(Sentry).toBeTruthy();
      expect(typeof Sentry.startSpan).toBe("function");
      expect(Sentry.getCurrentScope).toBeTruthy();
      expect(typeof Sentry.getCurrentScope).toBe("function");
      expect(Sentry.getCurrentScope()).not.toBe(undefined);
    });

    it("should call Sentry methods when conditions are met", () => {
      // Directly test if Sentry can be called
      const callback = jest.fn();
      Sentry.startSpan({ name: "test" }, callback);
      expect(callback).toHaveBeenCalled();
      expect(Sentry.startSpan).toHaveBeenCalled();
    });
  });

  describe("Metrics should use spans instead of events", () => {
    it("should not call captureEvent for batch metrics", () => {
      metrics.startSession();
      metrics.trackCardView("dog-123");
      metrics.trackSwipe("right", "dog-123");
      metrics.endSession();

      // The current implementation uses captureEvent, so this will fail initially
      expect(mockSentry.captureEvent).not.toHaveBeenCalled();
    });

    it("should use startSpan for tracking metrics", () => {
      jest.useFakeTimers();

      metrics.trackSwipe("right", "dog-123");

      // Wait for batch timeout or trigger flush
      jest.advanceTimersByTime(5000);

      // Should create span for metrics instead of event
      expect(mockSentry.startSpan).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it("should use span attributes for swipe metrics", () => {
      const mockSetAttribute = jest.fn();
      const mockSetAttributes = jest.fn();

      mockSentry.startSpan.mockImplementation(
        (options: SpanOptions, callback?: (span: MockSpan) => unknown) => {
          const span: MockSpan = {
            setAttribute: mockSetAttribute,
            setAttributes: mockSetAttributes,
            end: jest.fn(),
          };
          if (callback) {
            return callback(span);
          }
          return span;
        },
      );

      metrics.trackSwipe("left", "dog-456");
      metrics.trackCardView("dog-456");

      // Verify span is created with proper attributes
      expect(mockSentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining("swipe"),
          op: expect.stringContaining("metrics"),
        }),
        expect.any(Function),
      );
    });

    it("should use breadcrumbs for non-error telemetry", () => {
      metrics.trackQueueExhausted(10);

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: expect.stringContaining("swipe"),
          level: "info",
          data: expect.objectContaining({
            totalSwiped: 10,
          }),
        }),
      );
    });

  });

  describe("Session metrics tracking", () => {
    it("should track session metrics with span attributes", () => {
      metrics.startSession();
      metrics.trackCardView("dog-1");
      metrics.trackSwipe("right", "dog-1");
      metrics.trackCardView("dog-2");
      metrics.trackSwipe("left", "dog-2");
      metrics.endSession();

      expect(mockSentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining("session"),
          attributes: expect.objectContaining({
            "session.cards_viewed": expect.any(Number),
            "session.swipe_right": expect.any(Number),
            "session.swipe_left": expect.any(Number),
          }),
        }),
        expect.any(Function),
      );
    });
  });

  describe("Performance monitoring", () => {
    it("should use breadcrumbs for slow performance warnings", () => {
      metrics.checkFPSHealth();

      // Mock low FPS scenario
      const lowFPSMetrics = new SwipeMetrics();
      (lowFPSMetrics as unknown as { performanceMetrics: { fps: number; fpsHistory: number[] } }).performanceMetrics.fps = 20;
      (lowFPSMetrics as unknown as { performanceMetrics: { fps: number; fpsHistory: number[] } }).performanceMetrics.fpsHistory = Array(10).fill(20);

      lowFPSMetrics.checkFPSHealth();

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "performance",
          level: "warning",
          message: expect.stringContaining("Low FPS"),
        }),
      );
    });

  });

  describe("Batch processing", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should batch metrics and send as single span after timeout", () => {
      metrics.trackCardView("dog-1");
      metrics.trackCardView("dog-2");
      metrics.trackCardView("dog-3");

      // Individual spans are created immediately
      expect(mockSentry.startSpan).toHaveBeenCalledTimes(3);

      // Clear the mock to check batch flush
      mockSentry.startSpan.mockClear();

      // Advance time to trigger batch flush
      jest.advanceTimersByTime(5000);

      // Batch span should be created
      expect(mockSentry.startSpan).toHaveBeenCalledTimes(1);
      expect(mockSentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "swipe.metrics.batch",
          op: "metrics.batch",
          attributes: expect.objectContaining({
            "batch.size": 3,
          }),
        }),
        expect.any(Function),
      );
    });

    it("should flush batch when reaching size limit", () => {
      // Track 10 cards (batch size limit)
      for (let i = 0; i < 10; i++) {
        metrics.trackCardView(`dog-${i}`);
      }

      // 10 individual spans + 1 batch flush span
      expect(mockSentry.startSpan).toHaveBeenCalledTimes(11);

      // Check that batch span was created
      type StartSpanCall = [SpanOptions, ((span: MockSpan) => unknown)?];
      const batchCall = mockSentry.startSpan.mock.calls.find(
        (call: StartSpanCall) => call[0].name === "swipe.metrics.batch",
      );
      expect(batchCall).toBeDefined();
      expect(batchCall![0].attributes!["batch.size"]).toBe(10);
    });
  });
});
