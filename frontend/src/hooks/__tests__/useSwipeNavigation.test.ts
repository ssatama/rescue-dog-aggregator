import { renderHook, act, waitFor } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import { getAnimals } from "../../services/animalsService";
import { useSwipeNavigation } from "../useSwipeNavigation";

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
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockUseSwipeable = useSwipeable as jest.MockedFunction<typeof useSwipeable>;
const mockGetAnimals = getAnimals as jest.MockedFunction<typeof getAnimals>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  
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
  mockUseSearchParams.mockReturnValue({
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
    [Symbol.iterator]: jest.fn(),
  } as any);
  
  // Mock react-swipeable to return proper handlers
  mockUseSwipeable.mockImplementation((config) => ({
    onSwipedLeft: config.onSwipedLeft,
    onSwipedRight: config.onSwipedRight,
  }));
  
  // Mock getAnimals service with fresh mock data each time
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

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 3000 });

      expect(mockGetAnimals).toHaveBeenCalledWith(expect.objectContaining({
        limit: 1000,
      }));
    });

    it("should identify prev and next dogs correctly", async () => {
      const { result } = renderHook(() => useSwipeNavigation(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 3000 });

      expect(result.current.prevDog).toEqual(mockDogs[1]); // Bella
      expect(result.current.nextDog).toEqual(mockDogs[3]); // Luna
    });
  });

  describe("navigation", () => {
    it("should navigate to previous dog on swipe left", async () => {
      const { result } = renderHook(() => useSwipeNavigation(defaultProps));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handlers.onSwipedLeft();
      });

      expect(mockPush).toHaveBeenCalledWith("/dogs/dog-2");
    });

    it("should navigate to next dog on swipe right", async () => {
      const { result } = renderHook(() => useSwipeNavigation(defaultProps));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handlers.onSwipedRight();
      });

      expect(mockPush).toHaveBeenCalledWith("/dogs/dog-4");
    });

    it("should handle keyboard navigation - arrow left", async () => {
      const addEventListenerSpy = jest.spyOn(document, "addEventListener");
      
      const { result } = renderHook(() => useSwipeNavigation(defaultProps));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate ArrowLeft key press
      const keyHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === "keydown"
      )?.[1] as EventListener;

      act(() => {
        keyHandler(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
      });

      expect(mockPush).toHaveBeenCalledWith("/dogs/dog-2");
    });

    it("should handle keyboard navigation - arrow right", async () => {
      const addEventListenerSpy = jest.spyOn(document, "addEventListener");
      
      const { result } = renderHook(() => useSwipeNavigation(defaultProps));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate ArrowRight key press
      const keyHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === "keydown"
      )?.[1] as EventListener;

      act(() => {
        keyHandler(new KeyboardEvent("keydown", { key: "ArrowRight" }));
      });

      expect(mockPush).toHaveBeenCalledWith("/dogs/dog-4");
    });

    it("should preserve URL parameters when navigating", async () => {
      mockGet.mockImplementation((key) => {
        if (key === "breed") return "labrador";
        if (key === "size") return "large";
        return "";
      });

      const { result } = renderHook(() =>
        useSwipeNavigation({
          ...defaultProps,
          searchParams: { breed: "labrador", size: "large" },
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handlers.onSwipedRight();
      });

      expect(mockPush).toHaveBeenCalledWith("/dogs/dog-4?breed=labrador&size=large");
    });
  });

  describe("caching", () => {
    it("should implement LRU cache with 10-item limit", async () => {
      const { result, rerender } = renderHook((props = defaultProps) =>
        useSwipeNavigation(props)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Navigate through 12 different dogs to exceed cache limit
      const dogSlugs = Array.from({ length: 12 }, (_, i) => `dog-${i + 1}`);
      
      for (let i = 0; i < 12; i++) {
        mockGetAnimals.mockResolvedValueOnce(
          mockDogs.map((dog, index) => ({ ...dog, slug: `dog-${i * 7 + index + 1}` }))
        );
        
        rerender({ currentDogSlug: dogSlugs[i], searchParams: {} });
        
        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });
      }

      // Cache should only contain the last 10 entries
      expect(mockGetAnimals).toHaveBeenCalledTimes(12);
    });

    it("should reuse cached data when revisiting same dog", async () => {
      const { result, rerender } = renderHook((props = defaultProps) =>
        useSwipeNavigation(props)
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
        limit: 1000,
      });
    });

    it("should handle edge cases - first dog", async () => {
      const { result } = renderHook(() =>
        useSwipeNavigation({ ...defaultProps, currentDogSlug: "dog-1" })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.prevDog).toBeNull();
      expect(result.current.nextDog).toEqual(mockDogs[1]);
    });

    it("should handle edge cases - last dog", async () => {
      mockGetAnimals.mockResolvedValueOnce(mockDogs);
      
      const { result } = renderHook(() =>
        useSwipeNavigation({ ...defaultProps, currentDogSlug: "dog-7" })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.prevDog).toEqual(mockDogs[5]);
      expect(result.current.nextDog).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should handle API errors gracefully", async () => {
      mockGetAnimals.mockRejectedValueOnce(new Error("API Error"));
      
      const { result } = renderHook(() => useSwipeNavigation(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.prevDog).toBeNull();
      expect(result.current.nextDog).toBeNull();
    });

    it("should not navigate when no adjacent dogs are available", async () => {
      const { result } = renderHook(() =>
        useSwipeNavigation({ ...defaultProps, currentDogSlug: "dog-1" })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handlers.onSwipedLeft();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("should remove event listeners on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");
      
      const { unmount } = renderHook(() => useSwipeNavigation(defaultProps));
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
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
        })
      );

      expect(originalSearchParams).toEqual(searchParamsCopy);
    });
  });
});