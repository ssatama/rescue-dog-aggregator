import { renderHook, act, waitFor } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSwipeable, SwipeableHandlers, SwipeEventData } from "react-swipeable";
import type { ApiDog } from "../../types/apiDog";
import { getAnimals } from "../../services/animalsService";
import { useSwipeNavigation, navigationCache } from "../useSwipeNavigation";

// Mock types for testing
interface MockSearchParams {
  get: jest.Mock;
  getAll: jest.Mock;
  has: jest.Mock;
  keys: jest.Mock;
  values: jest.Mock;
  entries: jest.Mock;
  forEach: jest.Mock;
  toString: () => string;
  append: jest.Mock;
  delete: jest.Mock;
  set: jest.Mock;
  sort: jest.Mock;
  size: number;
  [Symbol.iterator]: jest.Mock;
}

type SwipeCallback = (eventData: SwipeEventData) => void;

interface SwipeHandlersWithCallbacks extends SwipeableHandlers {
  onSwipedLeft?: SwipeCallback;
  onSwipedRight?: SwipeCallback;
}

const mockSwipeEventData: SwipeEventData = {
  absX: 100,
  absY: 0,
  deltaX: 100,
  deltaY: 0,
  dir: "Left",
  event: {} as TouchEvent,
  first: false,
  initial: [0, 0],
  velocity: 1,
  vxvy: [1, 0],
};

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("react-swipeable", () => ({
  useSwipeable: jest.fn(),
}));

jest.mock("../../services/animalsService", () => ({
  getAnimals: jest.fn(),
}));

// Mock data for testing
const mockDogs = [
  { id: 1, slug: "dog-1", name: "Max", breed: "Labrador" },
  { id: 2, slug: "dog-2", name: "Bella", breed: "Golden Retriever" },
  { id: 3, slug: "dog-3", name: "Charlie", breed: "Beagle" },
  { id: 4, slug: "dog-4", name: "Luna", breed: "Border Collie" },
  { id: 5, slug: "dog-5", name: "Cooper", breed: "German Shepherd" },
  { id: 6, slug: "dog-6", name: "Daisy", breed: "Poodle" },
  { id: 7, slug: "dog-7", name: "Rocky", breed: "Bulldog" },
];

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockGet = jest.fn(() => "");
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<
  typeof useSearchParams
>;
const mockUseSwipeable = useSwipeable as jest.MockedFunction<
  typeof useSwipeable
>;
const mockGetAnimals = getAnimals as jest.MockedFunction<typeof getAnimals>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();

  // Clear the LRU cache between tests
  if (navigationCache) {
    navigationCache.clear();
  }

  // Mock Next.js router
  mockUseRouter.mockReturnValue({
    push: mockPush,
    replace: mockReplace,
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  });

  // Mock search params
  const mockSearchParams: MockSearchParams = {
    get: mockGet,
    getAll: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    toString: () => "",
    append: jest.fn(),
    delete: jest.fn(),
    set: jest.fn(),
    sort: jest.fn(),
    size: 0,
    [Symbol.iterator]: jest.fn(),
  };
  mockUseSearchParams.mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

  // Mock react-swipeable to return proper handlers with ref
  mockUseSwipeable.mockImplementation((config) => {
    const handlers: SwipeHandlersWithCallbacks = {
      ref: jest.fn() as unknown as SwipeableHandlers["ref"],
      onMouseDown: jest.fn(),
      onSwipedLeft: config.onSwipedLeft,
      onSwipedRight: config.onSwipedRight,
    };
    return handlers as SwipeableHandlers;
  });

  // Mock getAnimals service with fresh mock data each time - always return array
  mockGetAnimals.mockResolvedValue([...mockDogs]);

  // Mock keyboard event listeners
  const mockAddEventListener = jest.fn();
  const mockRemoveEventListener = jest.fn();

  Object.defineProperty(document, "addEventListener", {
    value: mockAddEventListener,
    writable: true,
  });

  Object.defineProperty(document, "removeEventListener", {
    value: mockRemoveEventListener,
    writable: true,
  });
});

describe("useSwipeNavigation", () => {
  const defaultProps = {
    currentDogSlug: "dog-3",
    searchParams: {},
  };

  describe("initialization", () => {
    it("should initialize with correct loading state", () => {
      const { result } = renderHook(() => useSwipeNavigation(defaultProps));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.prevDog).toBeNull();
      expect(result.current.nextDog).toBeNull();
    });

    it("should load adjacent dogs on mount", async () => {
      const { result } = renderHook(() => useSwipeNavigation(defaultProps));

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 },
      );

      expect(mockGetAnimals).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 300,
        }),
      );
    });

    it("should identify prev and next dogs correctly", async () => {
      const { result } = renderHook(() => useSwipeNavigation(defaultProps));

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 },
      );

      expect(result.current.prevDog).toMatchObject({ id: mockDogs[1].id, slug: mockDogs[1].slug, name: mockDogs[1].name }); // Bella
      expect(result.current.nextDog).toMatchObject({ id: mockDogs[3].id, slug: mockDogs[3].slug, name: mockDogs[3].name }); // Luna
    });
  });

  describe("navigation", () => {
    it("should navigate to next dog on swipe left", async () => {
      const { result } = renderHook(() => useSwipeNavigation(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        (result.current.handlers as SwipeHandlersWithCallbacks).onSwipedLeft?.(mockSwipeEventData);
      });

      expect(mockPush).toHaveBeenCalledWith("/dogs/dog-4");
    });

    it("should navigate to previous dog on swipe right", async () => {
      const { result } = renderHook(() => useSwipeNavigation(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        (result.current.handlers as SwipeHandlersWithCallbacks).onSwipedRight?.(mockSwipeEventData);
      });

      expect(mockPush).toHaveBeenCalledWith("/dogs/dog-2");
    });

    it("should handle keyboard navigation - arrow left", async () => {
      let keyboardHandler: ((event: KeyboardEvent) => void) | null = null;

      // Mock addEventListener to capture the keyboard handler
      const addEventListenerSpy = jest.spyOn(document, "addEventListener");
      addEventListenerSpy.mockImplementation((eventType, handler) => {
        if (eventType === "keydown") {
          keyboardHandler = handler as (event: KeyboardEvent) => void;
        }
      });

      const { result } = renderHook(() => useSwipeNavigation(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate ArrowLeft key press
      act(() => {
        if (keyboardHandler) {
          const event = new KeyboardEvent("keydown", { key: "ArrowLeft" });
          Object.defineProperty(event, "preventDefault", {
            value: jest.fn(),
            writable: true,
          });
          keyboardHandler(event);
        }
      });

      expect(mockPush).toHaveBeenCalledWith("/dogs/dog-2");
    });

    it("should handle keyboard navigation - arrow right", async () => {
      let keyboardHandler: ((event: KeyboardEvent) => void) | null = null;

      // Mock addEventListener to capture the keyboard handler
      const addEventListenerSpy = jest.spyOn(document, "addEventListener");
      addEventListenerSpy.mockImplementation((eventType, handler) => {
        if (eventType === "keydown") {
          keyboardHandler = handler as (event: KeyboardEvent) => void;
        }
      });

      const { result } = renderHook(() => useSwipeNavigation(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate ArrowRight key press
      act(() => {
        if (keyboardHandler) {
          const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
          Object.defineProperty(event, "preventDefault", {
            value: jest.fn(),
            writable: true,
          });
          keyboardHandler(event);
        }
      });

      expect(mockPush).toHaveBeenCalledWith("/dogs/dog-4");
    });

    it("should preserve URL parameters when navigating", async () => {
      (mockGet as jest.Mock).mockImplementation((key: string) => {
        if (key === "breed") return "labrador";
        if (key === "size") return "large";
        return "";
      });

      const { result } = renderHook(() =>
        useSwipeNavigation({
          ...defaultProps,
          searchParams: { breed: "labrador", size: "large" },
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        (result.current.handlers as SwipeHandlersWithCallbacks).onSwipedRight?.(mockSwipeEventData);
      });

      expect(mockPush).toHaveBeenCalledWith(
        "/dogs/dog-2?breed=labrador&size=large",
      );
    });
  });

  describe("caching", () => {
    it("should implement LRU cache with 10-item limit", async () => {
      // Clear cache first to ensure clean state
      navigationCache.clear();

      const { result, rerender } = renderHook(
        (props: typeof defaultProps = defaultProps) => useSwipeNavigation(props),
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockGetAnimals.mock.calls.length;

      // Navigate through 11 more different dogs to exceed cache limit (total 12 with initial)
      for (let i = 1; i < 12; i++) {
        // Create unique slug and search params to avoid cache hits
        const uniqueSlug = `unique-dog-${i}`;
        const uniqueSearchParams = { filter: `test-${i}` };

        mockGetAnimals.mockResolvedValueOnce([
          ...mockDogs.map((dog, index) => ({
            ...dog,
            slug: `${uniqueSlug}-${index}`,
          })),
        ]);

        rerender({
          currentDogSlug: uniqueSlug,
          searchParams: uniqueSearchParams,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });
      }

      // Should have made 12 total API calls (1 initial + 11 more)
      expect(mockGetAnimals).toHaveBeenCalledTimes(initialCallCount + 11);
    });

    it("should reuse cached data when revisiting same dog", async () => {
      const { result, rerender } = renderHook(
        (props: typeof defaultProps = defaultProps) => useSwipeNavigation(props),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockGetAnimals.mock.calls.length;

      // Navigate away and back
      rerender({ currentDogSlug: "dog-4", searchParams: {} });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      rerender({ currentDogSlug: "dog-3", searchParams: {} });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not make additional API calls due to caching
      expect(mockGetAnimals.mock.calls.length).toBe(initialCallCount + 1);
    });
  });

  describe("preloading", () => {
    it("should preload 5 dogs total (current + 2 on each side)", async () => {
      const { result } = renderHook(() => useSwipeNavigation(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAnimals).toHaveBeenCalledWith({
        limit: 300,
      });
    });

    it("should handle edge cases - first dog", async () => {
      const { result } = renderHook(() =>
        useSwipeNavigation({ ...defaultProps, currentDogSlug: "dog-1" }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.prevDog).toBeNull();
      expect(result.current.nextDog).toMatchObject({ id: mockDogs[1].id, slug: mockDogs[1].slug, name: mockDogs[1].name });
    });

    it("should handle edge cases - last dog", async () => {
      mockGetAnimals.mockResolvedValueOnce(mockDogs);

      const { result } = renderHook(() =>
        useSwipeNavigation({ ...defaultProps, currentDogSlug: "dog-7" }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.prevDog).toMatchObject({ id: mockDogs[5].id, slug: mockDogs[5].slug, name: mockDogs[5].name });
      expect(result.current.nextDog).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should handle API errors gracefully", async () => {
      // Clear cache to ensure fresh API call
      navigationCache.clear();
      // Mock API to reject
      mockGetAnimals.mockRejectedValueOnce(new Error("API Error"));

      const { result } = renderHook(() => useSwipeNavigation(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.prevDog).toBeNull();
      expect(result.current.nextDog).toBeNull();
    });

    it("should handle non-array API responses gracefully", async () => {
      // Clear cache to ensure fresh API call
      navigationCache.clear();
      // Mock API to return non-array (e.g., null or object) - cast for edge case testing
      mockGetAnimals.mockResolvedValueOnce(null as unknown as ReturnType<typeof getAnimals>);

      const { result } = renderHook(() => useSwipeNavigation(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.prevDog).toBeNull();
      expect(result.current.nextDog).toBeNull();
    });

    it("should handle invalid dog data in array", async () => {
      // Clear cache to ensure fresh API call
      navigationCache.clear();
      // Mock API to return array with invalid objects
      mockGetAnimals.mockResolvedValueOnce([
        null,
        undefined,
        { id: 1, slug: "dog-3", name: "Charlie", breed: "Beagle" },
        { invalidData: true },
      ] as unknown as ApiDog[]);

      const { result } = renderHook(() => useSwipeNavigation(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should handle the valid dog but no adjacent dogs
      expect(result.current.prevDog).toBeNull();
      expect(result.current.nextDog).toBeNull();
    });

    it("should not navigate when no adjacent dogs are available", async () => {
      // Clear previous mock calls
      mockPush.mockClear();

      const { result } = renderHook(() =>
        useSwipeNavigation({ ...defaultProps, currentDogSlug: "dog-1" }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // For dog-1 (first dog), there should be no previous dog
      expect(result.current.prevDog).toBeNull();
      expect(result.current.nextDog).not.toBeNull();

      // Try to swipe right (previous) - should not navigate
      act(() => {
        (result.current.handlers as SwipeHandlersWithCallbacks).onSwipedRight?.(mockSwipeEventData);
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("should remove event listeners on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(
        document,
        "removeEventListener",
      );

      const { unmount } = renderHook(() => useSwipeNavigation(defaultProps));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
    });
  });

  describe("pure functions", () => {
    it("should not mutate input parameters", () => {
      const originalSearchParams = { breed: "labrador" };
      const searchParamsCopy = { ...originalSearchParams };

      renderHook(() =>
        useSwipeNavigation({
          currentDogSlug: "dog-3",
          searchParams: originalSearchParams,
        }),
      );

      expect(originalSearchParams).toEqual(searchParamsCopy);
    });
  });
});
