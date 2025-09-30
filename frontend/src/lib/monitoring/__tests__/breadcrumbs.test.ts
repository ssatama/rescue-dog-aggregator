import * as Sentry from "@sentry/nextjs";
import {
  trackDogView,
  trackDogCardClick,
  trackDogImageView,
  trackFavoriteToggle,
  trackFavoritesPageView,
  trackSearch,
  trackFilterChange,
  trackSortChange,
  trackOrgPageView,
  trackExternalLinkClick,
  trackPaginationClick,
  trackSearchDebounced,
  trackFilterChangeDebounced,
  cancelPendingTracking,
  addTestBreadcrumb,
} from "../breadcrumbs";

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  addBreadcrumb: jest.fn(),
  getClient: jest.fn(),
  getCurrentScope: jest.fn(),
}));

// Mock console.error to avoid noise in test output
const mockConsoleError = jest.spyOn(console, "error").mockImplementation();

describe("Breadcrumb Tracking Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    mockConsoleError.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe("trackDogView", () => {
    it("should add navigation breadcrumb for dog view", () => {
      trackDogView("123", "Buddy", "rescue-org");

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "navigation",
        type: "navigation",
        level: "info",
        message: "Viewed dog: Buddy",
        data: {
          dogId: "123",
          dogName: "Buddy",
          orgSlug: "rescue-org",
        },
      });
    });

    it("should handle errors gracefully without throwing", () => {
      const mockError = new Error("Sentry error");
      (Sentry.addBreadcrumb as jest.Mock).mockImplementationOnce(() => {
        throw mockError;
      });

      // Should not throw error
      expect(() => {
        trackDogView("123", "Buddy", "rescue-org");
      }).not.toThrow();
    });
  });

  describe("trackDogCardClick", () => {
    it("should add ui breadcrumb for dog card click", () => {
      trackDogCardClick("456", "Max", 2, "search");

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "ui",
        type: "user",
        level: "info",
        message: "Clicked dog card: Max at position 3",
        data: {
          dogId: "456",
          dogName: "Max",
          position: 2,
          listContext: "search",
        },
      });
    });

    it("should handle different list contexts", () => {
      const contexts: Array<"search" | "org-page" | "home" | "favorites"> = [
        "search",
        "org-page",
        "home",
        "favorites",
      ];

      contexts.forEach((context) => {
        jest.clearAllMocks();
        trackDogCardClick("789", "Luna", 0, context);

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              listContext: context,
            }),
          }),
        );
      });
    });
  });

  describe("trackDogImageView", () => {
    it("should add ui breadcrumb for image view", () => {
      trackDogImageView("789", 1, 5);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "ui",
        type: "user",
        level: "info",
        message: "Viewed image 2 of 5",
        data: {
          dogId: "789",
          imageIndex: 1,
          totalImages: 5,
        },
      });
    });

    it("should handle first image (index 0)", () => {
      trackDogImageView("789", 0, 3);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Viewed image 1 of 3",
        }),
      );
    });
  });

  describe("trackFavoriteToggle", () => {
    it("should track adding to favorites", () => {
      trackFavoriteToggle("add", "321", "Charlie", "shelter-1");

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "ui",
        type: "user",
        level: "info",
        message: "Added favorite: Charlie",
        data: {
          action: "add",
          dogId: "321",
          dogName: "Charlie",
          orgSlug: "shelter-1",
        },
      });
    });

    it("should track removing from favorites", () => {
      trackFavoriteToggle("remove", "321", "Charlie", "shelter-1");

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "ui",
        type: "user",
        level: "info",
        message: "Removed favorite: Charlie",
        data: {
          action: "remove",
          dogId: "321",
          dogName: "Charlie",
          orgSlug: "shelter-1",
        },
      });
    });
  });

  describe("trackFavoritesPageView", () => {
    it("should track favorites page view with count", () => {
      trackFavoritesPageView(12);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "navigation",
        type: "navigation",
        level: "info",
        message: "Viewed favorites page with 12 dogs",
        data: {
          count: 12,
        },
      });
    });

    it("should handle zero favorites", () => {
      trackFavoritesPageView(0);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Viewed favorites page with 0 dogs",
        }),
      );
    });
  });

  describe("trackSearch", () => {
    it("should track search with query and filters", () => {
      const filters = { breed: "labrador", age: "young" };
      trackSearch("fluffy dogs", filters, 25);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "ui",
        type: "user",
        level: "info",
        message: 'Searched for "fluffy dogs" with 2 filters (25 results)',
        data: {
          query: "fluffy dogs",
          filters,
          resultCount: 25,
        },
      });
    });

    it("should track filter-only search without query", () => {
      const filters = { size: "small" };
      trackSearch(undefined, filters, 10);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "ui",
        type: "user",
        level: "info",
        message: "Applied 1 filters (10 results)",
        data: {
          query: null,
          filters,
          resultCount: 10,
        },
      });
    });

    it("should handle empty filters", () => {
      trackSearch("puppies", {}, 50);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Searched for "puppies" with 0 filters (50 results)',
        }),
      );
    });
  });

  describe("trackFilterChange", () => {
    it("should track filter changes", () => {
      trackFilterChange("breed", "golden retriever", 15);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "ui",
        type: "user",
        level: "info",
        message: 'Changed filter: breed to "golden retriever"',
        data: {
          filterType: "breed",
          value: "golden retriever",
          resultCount: 15,
        },
      });
    });

    it("should handle array values", () => {
      trackFilterChange("ages", ["young", "adult"], 30);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Changed filter: ages to ["young","adult"]',
        }),
      );
    });

    it("should handle boolean values", () => {
      trackFilterChange("goodWithKids", true, 20);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Changed filter: goodWithKids to true",
        }),
      );
    });
  });

  describe("trackSortChange", () => {
    it("should track sort order changes", () => {
      trackSortChange("newest");

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "ui",
        type: "user",
        level: "info",
        message: "Changed sort to: newest",
        data: {
          sortBy: "newest",
        },
      });
    });
  });

  describe("trackOrgPageView", () => {
    it("should track organization page view", () => {
      trackOrgPageView("happy-tails", 45);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "navigation",
        type: "navigation",
        level: "info",
        message: "Viewed organization: happy-tails",
        data: {
          orgSlug: "happy-tails",
          dogCount: 45,
        },
      });
    });
  });

  describe("trackExternalLinkClick", () => {
    it("should track adopt link click with dog ID", () => {
      trackExternalLinkClick("adopt", "rescue-org", "123");

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "ui",
        type: "user",
        level: "info",
        message: "Clicked adopt link for dog 123",
        data: {
          linkType: "adopt",
          orgSlug: "rescue-org",
          dogId: "123",
        },
      });
    });

    it("should track donate link click without dog ID", () => {
      trackExternalLinkClick("donate", "rescue-org");

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "ui",
        type: "user",
        level: "info",
        message: "Clicked donate link for rescue-org",
        data: {
          linkType: "donate",
          orgSlug: "rescue-org",
          dogId: null,
        },
      });
    });

    it("should track org website link", () => {
      trackExternalLinkClick("org-website", "rescue-org");

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Clicked org-website link for rescue-org",
        }),
      );
    });
  });

  describe("trackPaginationClick", () => {
    it("should track pagination navigation", () => {
      trackPaginationClick(3, 10);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "navigation",
        type: "navigation",
        level: "info",
        message: "Navigated to page 3 of 10",
        data: {
          page: 3,
          totalPages: 10,
        },
      });
    });

    it("should handle first page", () => {
      trackPaginationClick(1, 5);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Navigated to page 1 of 5",
        }),
      );
    });

    it("should handle last page", () => {
      trackPaginationClick(5, 5);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Navigated to page 5 of 5",
        }),
      );
    });
  });

  describe("Debounced Functions", () => {
    describe("trackSearchDebounced", () => {
      it("should debounce search tracking with default delay", () => {
        const filters = { breed: "poodle" };

        trackSearchDebounced("test query", filters, 10);
        expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();

        jest.advanceTimersByTime(499);
        expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Searched for "test query" with 1 filters (10 results)',
          }),
        );
      });

      it("should cancel previous timer on rapid calls", () => {
        trackSearchDebounced("query1", {}, 5);
        jest.advanceTimersByTime(300);

        trackSearchDebounced("query2", {}, 10);
        jest.advanceTimersByTime(500);

        expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(1);
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Searched for "query2" with 0 filters (10 results)',
          }),
        );
      });

      it("should respect custom delay", () => {
        trackSearchDebounced("custom", {}, 5, 1000);

        jest.advanceTimersByTime(999);
        expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        expect(Sentry.addBreadcrumb).toHaveBeenCalled();
      });
    });

    describe("trackFilterChangeDebounced", () => {
      it("should debounce filter tracking with default delay", () => {
        trackFilterChangeDebounced("size", "large", 20);
        expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();

        jest.advanceTimersByTime(299);
        expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Changed filter: size to "large"',
          }),
        );
      });

      it("should track different filters independently", () => {
        trackFilterChangeDebounced("breed", "terrier", 15);
        trackFilterChangeDebounced("age", "senior", 8);

        jest.advanceTimersByTime(300);

        expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(2);
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Changed filter: breed to "terrier"',
          }),
        );
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Changed filter: age to "senior"',
          }),
        );
      });

      it("should cancel only same filter type on rapid changes", () => {
        trackFilterChangeDebounced("breed", "poodle", 10);
        jest.advanceTimersByTime(100);

        trackFilterChangeDebounced("breed", "labrador", 12);
        trackFilterChangeDebounced("size", "medium", 8);

        jest.advanceTimersByTime(300);

        expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(2);
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Changed filter: breed to "labrador"',
          }),
        );
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Changed filter: size to "medium"',
          }),
        );
      });

      it("should respect custom delay", () => {
        trackFilterChangeDebounced("age", "puppy", 25, 750);

        jest.advanceTimersByTime(749);
        expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        expect(Sentry.addBreadcrumb).toHaveBeenCalled();
      });
    });

    describe("cancelPendingTracking", () => {
      it("should cancel all pending debounced calls", () => {
        trackSearchDebounced("search", {}, 10);
        trackFilterChangeDebounced("breed", "beagle", 5);
        trackFilterChangeDebounced("age", "young", 3);

        cancelPendingTracking();

        jest.advanceTimersByTime(1000);
        expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
      });

      it("should allow new tracking after cancellation", () => {
        trackSearchDebounced("first", {}, 5);
        cancelPendingTracking();

        trackSearchDebounced("second", {}, 10);
        jest.advanceTimersByTime(500);

        expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(1);
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Searched for "second" with 0 filters (10 results)',
          }),
        );
      });
    });
  });

  describe("Test Utilities", () => {
    describe("addTestBreadcrumb", () => {
      const originalEnv = process.env.NODE_ENV;

      afterEach(() => {
        Object.defineProperty(process.env, "NODE_ENV", {
          value: originalEnv,
          writable: true,
          configurable: true,
        });
      });

      it("should add test breadcrumb in development", () => {
        Object.defineProperty(process.env, "NODE_ENV", {
          value: "development",
          writable: true,
          configurable: true,
        });
        const data = { testId: "123", action: "test" };

        addTestBreadcrumb("Test message", data);

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
          category: "test",
          type: "debug",
          level: "debug",
          message: "[TEST] Test message",
          data,
        });
      });

      it("should not add breadcrumb in production", () => {
        Object.defineProperty(process.env, "NODE_ENV", {
          value: "production",
          writable: true,
          configurable: true,
        });

        addTestBreadcrumb("Test message");

        expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
      });

      it("should handle missing data parameter", () => {
        Object.defineProperty(process.env, "NODE_ENV", {
          value: "development",
          writable: true,
          configurable: true,
        });

        addTestBreadcrumb("Test without data");

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
          expect.objectContaining({
            data: {},
          }),
        );
      });

      it("should handle errors gracefully without throwing", () => {
        Object.defineProperty(process.env, "NODE_ENV", {
          value: "development",
          writable: true,
          configurable: true,
        });
        const mockError = new Error("Test error");
        (Sentry.addBreadcrumb as jest.Mock).mockImplementationOnce(() => {
          throw mockError;
        });

        // Should not throw error
        expect(() => {
          addTestBreadcrumb("Error test");
        }).not.toThrow();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle errors in all tracking functions without throwing", () => {
      const mockError = new Error("Sentry unavailable");
      (Sentry.addBreadcrumb as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      const trackingFunctions = [
        () => trackDogView("1", "Dog", "org"),
        () => trackDogCardClick("1", "Dog", 0, "home"),
        () => trackDogImageView("1", 0, 1),
        () => trackFavoriteToggle("add", "1", "Dog", "org"),
        () => trackFavoritesPageView(5),
        () => trackSearch("query", {}, 10),
        () => trackFilterChange("breed", "value", 5),
        () => trackSortChange("newest"),
        () => trackOrgPageView("org", 10),
        () => trackExternalLinkClick("adopt", "org"),
        () => trackPaginationClick(1, 5),
      ];

      // None of these should throw errors
      trackingFunctions.forEach((fn) => {
        expect(fn).not.toThrow();
      });
    });
  });
});
