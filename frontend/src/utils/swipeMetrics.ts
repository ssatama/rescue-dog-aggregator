import * as Sentry from "@sentry/nextjs";

// Runtime env checks to avoid import-time capture
const shouldSendEvents = (): boolean => {
  const isDev = process.env.NODE_ENV === "development";
  const forceSentry = process.env.NEXT_PUBLIC_FORCE_SENTRY === "true";
  return !isDev || forceSentry;
};

// Helper to check if Sentry is initialized and ready
const isSentryReady = (): boolean => {
  try {
    return (
      typeof window !== "undefined" &&
      Sentry &&
      typeof Sentry.startSpan === "function" &&
      Sentry.getCurrentScope &&
      typeof Sentry.getCurrentScope === "function" &&
      Sentry.getCurrentScope() !== undefined
    );
  } catch {
    return false;
  }
};

// Safe wrappers for Sentry methods (gate by env + readiness at call-time)
const safeStartSpan = (config: any, callback?: (span: any) => void): void => {
  if (shouldSendEvents() && isSentryReady()) {
    Sentry.startSpan(config, callback || (() => {}));
  } else if (callback) {
    // Call callback with dummy span if Sentry is not ready
    callback({ setAttribute: () => {} });
  }
};

const safeAddBreadcrumb = (breadcrumb: any): void => {
  if (shouldSendEvents() && isSentryReady()) {
    Sentry.addBreadcrumb(breadcrumb);
  }
};

// Event batching configuration
const EVENT_BATCH_SIZE = 10;
const EVENT_BATCH_TIMEOUT = 5000; // 5 seconds
let eventBatch: any[] = [];
let batchTimer: NodeJS.Timeout | null = null;

// Helper function to flush the event batch using spans
function flushEventBatch() {
  if (eventBatch.length === 0) return;

  if (shouldSendEvents() && isSentryReady()) {
    // Use span with attributes instead of captureEvent
    safeStartSpan(
      {
        name: "swipe.metrics.batch",
        op: "metrics.batch",
        attributes: {
          "batch.size": eventBatch.length,
          "batch.timestamp": new Date().toISOString(),
        },
      },
      (span) => {
        // Add each event as span attributes
        eventBatch.forEach((event, index) => {
          Object.entries(event).forEach(([key, value]) => {
            // Only add primitive values as attributes (string, number, boolean)
            if (
              value !== null &&
              value !== undefined &&
              typeof value !== "object"
            ) {
              // Convert to proper attribute value type
              const attrValue =
                typeof value === "boolean" ? value : String(value);
              span.setAttribute(`event.${index}.${key}`, attrValue);
            }
          });
        });
      },
    );
  }

  eventBatch = [];
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
}

// Helper function to add metrics to batch
function addMetricToBatch(metric: any) {
  eventBatch.push({
    ...metric,
    timestamp: new Date().toISOString(),
  });

  // Flush if batch is full
  if (eventBatch.length >= EVENT_BATCH_SIZE) {
    flushEventBatch();
  } else if (!batchTimer) {
    // Set timer to flush after timeout
    batchTimer = setTimeout(flushEventBatch, EVENT_BATCH_TIMEOUT);
  }
}

interface SessionMetrics {
  sessionActive: boolean;
  sessionStartTime: number | null;
  cardsViewed: number;
  swipeRight: number;
  swipeLeft: number;
  cardViewTimes: number[];
  avgTimePerCard: number;
}

interface PerformanceMetrics {
  fps: number;
  frameCount: number;
  lastFrameTime: number;
  fpsHistory: number[];
  animationFrameId: number | null;
}

export class SwipeMetrics {
  private sessionMetrics: SessionMetrics;
  private performanceMetrics: PerformanceMetrics;
  private cardStartTime: Map<string, number>;
  private swipeGestureStart: number | null;

  constructor() {
    this.sessionMetrics = this.initSessionMetrics();
    this.performanceMetrics = this.initPerformanceMetrics();
    this.cardStartTime = new Map();
    this.swipeGestureStart = null;
  }

  private initSessionMetrics(): SessionMetrics {
    return {
      sessionActive: false,
      sessionStartTime: null,
      cardsViewed: 0,
      swipeRight: 0,
      swipeLeft: 0,
      cardViewTimes: [],
      avgTimePerCard: 0,
    };
  }

  private initPerformanceMetrics(): PerformanceMetrics {
    return {
      fps: 60,
      frameCount: 0,
      lastFrameTime: 0,
      fpsHistory: [],
      animationFrameId: null,
    };
  }

  startSession(): void {
    this.sessionMetrics = this.initSessionMetrics();
    this.sessionMetrics.sessionActive = true;
    this.sessionMetrics.sessionStartTime = this.now();

    if (this.hasPerformanceAPI()) {
      performance.mark("swipe-session-start");
    }
  }

  endSession(): void {
    if (!this.sessionMetrics.sessionActive) return;

    const sessionDuration =
      this.now() - (this.sessionMetrics.sessionStartTime || 0);

    if (this.hasPerformanceAPI()) {
      performance.mark("swipe-session-end");
      performance.measure(
        "swipe-session-duration",
        "swipe-session-start",
        "swipe-session-end",
      );
    }

    // Use span with attributes for session summary
    safeStartSpan(
      {
        name: "swipe.session.summary",
        op: "metrics.session",
        attributes: {
          "session.duration": sessionDuration,
          "session.cards_viewed": this.sessionMetrics.cardsViewed,
          "session.swipe_right": this.sessionMetrics.swipeRight,
          "session.swipe_left": this.sessionMetrics.swipeLeft,
          "session.avg_time_per_card": this.sessionMetrics.avgTimePerCard,
        },
      },
      () => {
        // Session tracking logic
      },
    );

    // Force flush any pending events when session ends
    flushEventBatch();

    this.sessionMetrics = this.initSessionMetrics();
  }

  trackCardView(dogId: string): void {
    const now = this.now();

    if (this.cardStartTime.has(dogId)) {
      const viewTime = now - this.cardStartTime.get(dogId)!;
      this.sessionMetrics.cardViewTimes.push(viewTime);
      this.updateAverageTimePerCard();
    }

    this.sessionMetrics.cardsViewed++;
    this.cardStartTime.set(dogId, now);

    // Create span for card view metrics
    safeStartSpan(
      {
        name: "swipe.card_view",
        op: "metrics.view",
        attributes: {
          "card.dog_id": dogId,
          "cards.viewed_count": this.sessionMetrics.cardsViewed,
        },
      },
      () => {},
    );

    // Also add to batch
    addMetricToBatch({
      type: "card_view",
      dogId,
      cardsViewed: this.sessionMetrics.cardsViewed,
    });
  }

  trackSwipe(direction: "left" | "right", dogId: string): void {
    if (direction === "right") {
      this.sessionMetrics.swipeRight++;
    } else {
      this.sessionMetrics.swipeLeft++;
    }

    if (this.cardStartTime.has(dogId)) {
      const viewTime = this.now() - this.cardStartTime.get(dogId)!;
      this.sessionMetrics.cardViewTimes.push(viewTime);
      this.updateAverageTimePerCard();
      this.cardStartTime.delete(dogId);
    }

    // Create span for swipe metrics
    safeStartSpan(
      {
        name: "swipe.action",
        op: "metrics.swipe",
        attributes: {
          "swipe.direction": direction,
          "swipe.dog_id": dogId,
          "swipe.right_count": this.sessionMetrics.swipeRight,
          "swipe.left_count": this.sessionMetrics.swipeLeft,
        },
      },
      () => {},
    );

    // Also add to batch
    addMetricToBatch({
      type: "swipe",
      direction,
      dogId,
      swipeRight: this.sessionMetrics.swipeRight,
      swipeLeft: this.sessionMetrics.swipeLeft,
    });
  }

  trackSwipeVelocity(velocity: number, direction: string): void {
    // Use span for velocity tracking
    safeStartSpan(
      {
        name: "swipe.gesture.velocity",
        op: "metrics.gesture",
        attributes: {
          "gesture.velocity": velocity,
          "gesture.direction": direction,
        },
      },
      () => {},
    );
  }

  trackQueueExhausted(totalSwiped: number): void {
    // Use breadcrumb for non-error telemetry
    safeAddBreadcrumb({
      category: "swipe.queue",
      message: "Queue exhausted",
      level: "info",
      data: {
        totalSwiped,
      },
    });
  }

  trackFavoriteAdded(dogId: string, source: string): void {
    // Use breadcrumb for favorite tracking
    safeAddBreadcrumb({
      category: "swipe.favorite",
      message: "Favorite added",
      level: "info",
      data: {
        dogId,
        source,
      },
    });
  }

  trackLoadTime(): void {
    if (!this.hasPerformanceAPI()) return;

    try {
      // Ensure start mark exists
      try {
        const startMarks = performance.getEntriesByName("swipe-init-start");
        if (startMarks.length === 0) {
          performance.mark("swipe-init-start");
        }
      } catch (e) {
        // If mark creation fails, just create it now
        performance.mark("swipe-init-start");
      }

      // Create end mark
      performance.mark("swipe-init-complete");

      // Measure only if we can
      let loadTime = 0;
      try {
        performance.measure(
          "swipe-load-time",
          "swipe-init-start",
          "swipe-init-complete",
        );

        const entries = performance.getEntriesByName("swipe-load-time");
        loadTime = entries.length > 0 ? entries[0].duration : 0;
      } catch (e) {
        // If measure fails, use navigationTiming as fallback
        loadTime = performance.now();
      }

      // Use span for performance metrics
      safeStartSpan(
        {
          name: "swipe.performance.load",
          op: "metrics.performance",
          attributes: {
            "performance.load_time": loadTime,
          },
        },
        (span) => {
          span.setAttribute("performance.load_time", loadTime);
        },
      );

      if (loadTime > 3000) {
        // Track as performance breadcrumb, not error
        safeAddBreadcrumb({
          message: `Slow swipe load time detected: ${loadTime.toFixed(0)}ms`,
          category: "performance",
          level: "warning",
          data: {
            loadTime,
            threshold: 3000,
          },
        });
      }
    } catch (error) {
      // If measure fails, just track without timing
      safeStartSpan(
        {
          name: "swipe.performance.load",
          op: "metrics.performance",
          attributes: {
            "performance.load_time": 0,
          },
        },
        () => {},
      );
    }
  }

  startFPSMonitoring(): void {
    if (!this.hasRequestAnimationFrame()) return;

    this.performanceMetrics.lastFrameTime = this.now();
    this.performanceMetrics.frameCount = 0;
    this.performanceMetrics.fpsHistory = [];

    const measureFPS = (timestamp: number) => {
      // Prevent infinite recursion in tests
      if (this.performanceMetrics.animationFrameId === null) return;

      // Use consistent time source
      const currentTime = timestamp || this.now();
      const deltaTime = currentTime - this.performanceMetrics.lastFrameTime;

      if (deltaTime >= 1000) {
        const fps = (this.performanceMetrics.frameCount * 1000) / deltaTime;
        this.performanceMetrics.fps = fps;
        this.performanceMetrics.fpsHistory.push(fps);

        if (this.performanceMetrics.fpsHistory.length > 60) {
          this.performanceMetrics.fpsHistory.shift();
        }

        this.performanceMetrics.frameCount = 0;
        this.performanceMetrics.lastFrameTime = currentTime;
      }

      this.performanceMetrics.frameCount++;

      // Only continue if still monitoring
      if (this.performanceMetrics.animationFrameId !== null) {
        this.performanceMetrics.animationFrameId =
          requestAnimationFrame(measureFPS);
      }
    };

    this.performanceMetrics.animationFrameId =
      requestAnimationFrame(measureFPS);
  }

  stopFPSMonitoring(): void {
    if (
      this.performanceMetrics.animationFrameId !== null &&
      this.hasRequestAnimationFrame()
    ) {
      cancelAnimationFrame(this.performanceMetrics.animationFrameId);
      this.performanceMetrics.animationFrameId = null;
    }
  }

  getCurrentFPS(): number {
    return Math.round(this.performanceMetrics.fps);
  }

  checkFPSHealth(): void {
    const avgFPS = this.getAverageFPS();

    if (avgFPS < 30) {
      // Track as performance breadcrumb, not error
      safeAddBreadcrumb({
        message: `Low FPS detected in swipe interface: ${avgFPS.toFixed(1)} fps`,
        category: "performance",
        level: "warning",
        data: {
          fps: avgFPS,
          threshold: 30,
          fpsHistory: this.performanceMetrics.fpsHistory.slice(-10), // Last 10 samples
        },
      });
    }
  }

  startSwipeGesture(): void {
    this.swipeGestureStart = this.now();

    if (this.hasPerformanceAPI()) {
      performance.mark(`swipe-gesture-start-${this.swipeGestureStart}`);
    }
  }

  endSwipeGesture(): void {
    if (!this.swipeGestureStart) return;

    const duration = this.now() - this.swipeGestureStart;

    if (this.hasPerformanceAPI()) {
      const endMark = `swipe-gesture-end-${this.now()}`;
      performance.mark(endMark);
      performance.measure(
        "swipe-gesture-duration",
        `swipe-gesture-start-${this.swipeGestureStart}`,
        endMark,
      );
    }

    if (duration > 500) {
      // Track as performance breadcrumb, not error
      safeAddBreadcrumb({
        message: `Slow swipe gesture detected: ${duration.toFixed(0)}ms`,
        category: "performance",
        level: "warning",
        data: {
          duration,
          threshold: 500,
        },
      });
    }

    this.swipeGestureStart = null;
  }

  getSessionMetrics(): SessionMetrics {
    return { ...this.sessionMetrics };
  }

  private updateAverageTimePerCard(): void {
    const times = this.sessionMetrics.cardViewTimes;
    if (times.length === 0) return;

    const sum = times.reduce((acc, time) => acc + time, 0);
    this.sessionMetrics.avgTimePerCard = sum / times.length;
  }

  private getAverageFPS(): number {
    const history = this.performanceMetrics.fpsHistory;
    if (history.length === 0) return this.performanceMetrics.fps;

    const sum = history.reduce((acc, fps) => acc + fps, 0);
    return sum / history.length;
  }

  private now(): number {
    return this.hasPerformanceAPI() ? performance.now() : Date.now();
  }

  private hasPerformanceAPI(): boolean {
    return (
      typeof performance !== "undefined" &&
      typeof performance.now === "function" &&
      typeof performance.mark === "function" &&
      typeof performance.measure === "function"
    );
  }

  private hasRequestAnimationFrame(): boolean {
    return (
      typeof requestAnimationFrame === "function" &&
      typeof cancelAnimationFrame === "function"
    );
  }
}

// Singleton instance
export const swipeMetrics = new SwipeMetrics();

// Export for testing purposes
export const testHelpers = {
  flushEventBatch,
  shouldSendEvents,
  isSentryReady,
};
