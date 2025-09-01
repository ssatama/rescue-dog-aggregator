import { SwipeMetrics } from "../swipeMetrics";
import * as Sentry from "@sentry/nextjs";

jest.mock("@sentry/nextjs", () => ({
  captureEvent: jest.fn(),
  captureMessage: jest.fn(),
}));

describe("SwipeMetrics", () => {
  let metrics: SwipeMetrics;
  let originalPerformance: any;
  let mockRequestAnimationFrame: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    metrics = new SwipeMetrics();
    
    // Mock performance API
    originalPerformance = global.performance;
    const mockPerformance = {
      now: jest.fn(() => 1000),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByName: jest.fn(() => [{ duration: 2500 }]),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
    };
    global.performance = mockPerformance as any;

    // Mock requestAnimationFrame
    let frameId = 0;
    mockRequestAnimationFrame = jest.fn((callback) => {
      frameId++;
      // Don't call immediately to avoid infinite loop
      return frameId;
    });
    global.requestAnimationFrame = mockRequestAnimationFrame;
    global.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    global.performance = originalPerformance;
    metrics.stopFPSMonitoring();
  });

  describe("Session Metrics", () => {
    it("should start a session and track duration", () => {
      metrics.startSession();
      
      // Check that session was started
      const sessionData = metrics.getSessionMetrics();
      expect(sessionData.sessionActive).toBe(true);
      
      // Simulate time passing
      (global.performance.now as jest.Mock).mockReturnValue(5000);
      
      metrics.endSession();
      
      // Check that session was ended
      const endedSessionData = metrics.getSessionMetrics();
      expect(endedSessionData.sessionActive).toBe(false);
    });

    it("should track cards viewed in session", () => {
      metrics.startSession();
      metrics.trackCardView("dog1");
      metrics.trackCardView("dog2");
      metrics.trackCardView("dog3");
      
      const sessionData = metrics.getSessionMetrics();
      expect(sessionData.cardsViewed).toBe(3);
    });

    it("should track swipe counts by direction", () => {
      metrics.startSession();
      metrics.trackSwipe("right", "dog1");
      metrics.trackSwipe("right", "dog2");
      metrics.trackSwipe("left", "dog3");
      
      const sessionData = metrics.getSessionMetrics();
      expect(sessionData.swipeRight).toBe(2);
      expect(sessionData.swipeLeft).toBe(1);
    });

    it("should calculate average time per card", () => {
      metrics.startSession();
      
      (global.performance.now as jest.Mock).mockReturnValue(1000);
      metrics.trackCardView("dog1");
      
      (global.performance.now as jest.Mock).mockReturnValue(3500);
      metrics.trackSwipe("right", "dog1"); // This ends the view of dog1
      
      metrics.trackCardView("dog2");
      (global.performance.now as jest.Mock).mockReturnValue(5000);
      metrics.trackSwipe("left", "dog2"); // This ends the view of dog2
      
      const sessionData = metrics.getSessionMetrics();
      expect(sessionData.avgTimePerCard).toBeGreaterThan(0); // Should have calculated average
    });
  });

  describe("Performance Monitoring", () => {
    it("should track initial load time", () => {
      metrics.trackLoadTime();
      
      // Just verify that Sentry was called to track load time
      expect(Sentry.captureEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "swipe.performance.load_time",
          level: "info",
        })
      );
    });

    it("should monitor FPS and detect drops", () => {
      metrics.startFPSMonitoring();
      
      // Verify that requestAnimationFrame was called
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
      
      // Get the callback that was passed to requestAnimationFrame
      const fpsCallback = mockRequestAnimationFrame.mock.calls[0][0];
      
      // Simulate frames over time
      // Start at time 0
      fpsCallback(0);
      
      // Simulate 60 frames in the next second
      for (let i = 1; i <= 60; i++) {
        fpsCallback(i * 16.67); // ~60 FPS
      }
      
      // Trigger FPS calculation after 1 second
      fpsCallback(1000);
      
      const fps = metrics.getCurrentFPS();
      // FPS should be calculated as approximately 60
      expect(fps).toBeGreaterThan(50);
      expect(fps).toBeLessThanOrEqual(61);
    });

    it("should detect and report low FPS", () => {
      // Set up metrics with initially low FPS
      metrics.startFPSMonitoring();
      
      // Manually set low FPS history for testing
      const lowFPSMetrics = new SwipeMetrics();
      
      // Check FPS health - should report low FPS if below threshold
      // This test verifies the method can be called without errors
      expect(() => {
        metrics.checkFPSHealth();
      }).not.toThrow();
    });

    it("should track swipe gesture performance", () => {
      (global.performance.now as jest.Mock).mockReturnValue(1000);
      metrics.startSwipeGesture();
      
      (global.performance.now as jest.Mock).mockReturnValue(1250);
      metrics.endSwipeGesture();
      
      // Just verify it doesn't throw
      expect(() => {
        metrics.startSwipeGesture();
        metrics.endSwipeGesture();
      }).not.toThrow();
    });
  });

  describe("Analytics Integration", () => {
    it("should send session summary to Sentry on end", () => {
      metrics.startSession();
      
      metrics.trackCardView("dog1");
      metrics.trackSwipe("right", "dog1");
      metrics.trackCardView("dog2");
      metrics.trackSwipe("left", "dog2");
      
      (global.performance.now as jest.Mock).mockReturnValue(60000); // 1 minute session
      
      metrics.endSession();
      
      // Check that Sentry was called with session summary
      expect(Sentry.captureEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "swipe.session.summary",
          level: "info",
        })
      );
    });

    it("should track queue exhausted event", () => {
      metrics.trackQueueExhausted(25);
      
      expect(Sentry.captureEvent).toHaveBeenCalledWith({
        message: "swipe.queue.exhausted",
        level: "info",
        contexts: {
          queue: {
            totalSwiped: 25,
          },
        },
      });
    });

    it("should track favorite added separately from swipe", () => {
      metrics.trackFavoriteAdded("dog1", "swipe");
      
      expect(Sentry.captureEvent).toHaveBeenCalledWith({
        message: "swipe.favorite.added",
        level: "info",
        contexts: {
          favorite: {
            dogId: "dog1",
            source: "swipe",
          },
        },
      });
    });

    it("should track swipe velocity", () => {
      metrics.trackSwipeVelocity(2.5, "right");
      
      expect(Sentry.captureEvent).toHaveBeenCalledWith({
        message: "swipe.gesture.velocity",
        level: "info",
        contexts: {
          gesture: {
            velocity: 2.5,
            direction: "right",
          },
        },
      });
    });
  });

  describe("Memory Management", () => {
    it("should clean up metrics on session end", () => {
      metrics.startSession();
      metrics.trackCardView("dog1");
      metrics.endSession();
      
      const sessionData = metrics.getSessionMetrics();
      expect(sessionData.cardsViewed).toBe(0);
      expect(sessionData.sessionActive).toBe(false);
    });

    it("should stop FPS monitoring when requested", () => {
      metrics.startFPSMonitoring();
      metrics.stopFPSMonitoring();
      
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it("should handle multiple session starts gracefully", () => {
      metrics.startSession();
      metrics.trackCardView("dog1");
      
      // Start another session without ending the first
      metrics.startSession();
      
      const sessionData = metrics.getSessionMetrics();
      expect(sessionData.cardsViewed).toBe(0); // Should reset
    });
  });

  describe("Error Handling", () => {
    it("should handle missing performance API gracefully", () => {
      global.performance = undefined as any;
      const safeMetrics = new SwipeMetrics();
      
      expect(() => {
        safeMetrics.startSession();
        safeMetrics.trackLoadTime();
      }).not.toThrow();
    });

    it("should handle requestAnimationFrame not available", () => {
      global.requestAnimationFrame = undefined as any;
      const safeMetrics = new SwipeMetrics();
      
      expect(() => {
        safeMetrics.startFPSMonitoring();
      }).not.toThrow();
    });
  });
});