import * as Sentry from "@sentry/nextjs";

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

    Sentry.captureEvent({
      message: "swipe.session.summary",
      level: "info",
      contexts: {
        session: {
          duration: sessionDuration,
          cardsViewed: this.sessionMetrics.cardsViewed,
          swipeRight: this.sessionMetrics.swipeRight,
          swipeLeft: this.sessionMetrics.swipeLeft,
          avgTimePerCard: this.sessionMetrics.avgTimePerCard,
        },
      },
    });

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
  }

  trackSwipeVelocity(velocity: number, direction: string): void {
    Sentry.captureEvent({
      message: "swipe.gesture.velocity",
      level: "info",
      contexts: {
        gesture: {
          velocity,
          direction,
        },
      },
    });
  }

  trackQueueExhausted(totalSwiped: number): void {
    Sentry.captureEvent({
      message: "swipe.queue.exhausted",
      level: "info",
      contexts: {
        queue: {
          totalSwiped,
        },
      },
    });
  }

  trackFavoriteAdded(dogId: string, source: string): void {
    Sentry.captureEvent({
      message: "swipe.favorite.added",
      level: "info",
      contexts: {
        favorite: {
          dogId,
          source,
        },
      },
    });
  }

  trackLoadTime(): void {
    if (!this.hasPerformanceAPI()) return;

    // Check if start mark exists, if not create it
    try {
      const startMarks = performance.getEntriesByName("swipe-init-start");
      if (startMarks.length === 0) {
        performance.mark("swipe-init-start");
      }

      performance.mark("swipe-init-complete");
      performance.measure(
        "swipe-load-time",
        "swipe-init-start",
        "swipe-init-complete",
      );

      const entries = performance.getEntriesByName("swipe-load-time");
      const loadTime = entries.length > 0 ? entries[0].duration : 0;

      Sentry.captureEvent({
        message: "swipe.performance.load_time",
        level: "info",
        contexts: {
          performance: {
            loadTime,
          },
        },
      });

      if (loadTime > 3000) {
        Sentry.captureMessage(
          `Slow swipe load time detected: ${loadTime.toFixed(0)}ms`,
          "warning",
        );
      }
    } catch (error) {
      // If measure fails, just track the event without timing
      Sentry.captureEvent({
        message: "swipe.performance.load_time",
        level: "info",
        contexts: {
          performance: {
            loadTime: 0,
          },
        },
      });
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
      Sentry.captureMessage(
        `Low FPS detected in swipe interface: ${avgFPS.toFixed(1)} fps`,
        "warning",
      );
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
      Sentry.captureMessage(
        `Slow swipe gesture detected: ${duration.toFixed(0)}ms`,
        "warning",
      );
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
