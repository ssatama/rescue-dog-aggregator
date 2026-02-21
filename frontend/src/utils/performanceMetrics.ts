import { logger } from "./logger";

export interface PerformanceMetrics {
  renderTime: number;
  imageLoadTime: number;
  interactionTime: number;
}

export class SwipePerformanceTracker {
  private marks: Map<string, number> = new Map();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(startMark: string, endMark: string): number {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);

    if (!start || !end) {
      return 0;
    }

    return end - start;
  }

  measureRenderTime(): number {
    return this.measure("render-start", "render-complete");
  }

  measureImageLoadTime(): number {
    return this.measure("image-load-start", "image-load-complete");
  }

  measureInteractionTime(): number {
    return this.measure("interaction-start", "interaction-complete");
  }

  reset(): void {
    this.marks.clear();
  }

  logMetrics(): void {
    if (typeof window !== "undefined") {
      logger.log("Performance Metrics:", {
        renderTime: `${this.measureRenderTime().toFixed(2)}ms`,
        imageLoadTime: `${this.measureImageLoadTime().toFixed(2)}ms`,
        interactionTime: `${this.measureInteractionTime().toFixed(2)}ms`,
      });
    }
  }
}

export const swipePerformanceTracker = new SwipePerformanceTracker();
