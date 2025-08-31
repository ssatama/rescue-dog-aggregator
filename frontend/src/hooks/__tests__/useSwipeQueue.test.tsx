import { renderHook, act, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import React from "react";
import { useSwipeQueue } from "../useSwipeQueue";
import * as swipeApi from "../../services/swipeApi";

jest.mock("../../services/swipeApi");

describe("useSwipeQueue", () => {
  const mockFetchSwipeDogs = swipeApi.fetchSwipeDogs as jest.MockedFunction<typeof swipeApi.fetchSwipeDogs>;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SWRConfig value={{ provider: () => new Map() }}>
      {children}
    </SWRConfig>
  );

  const createMockDogs = (count: number, startId = 1) => {
    return Array.from({ length: count }, (_, i) => ({
      id: startId + i,
      name: `Dog ${startId + i}`,
      breed: "Mixed Breed",
      age: "2 years",
      image: `https://example.com/dog${startId + i}.jpg`,
      organization: "Test Rescue",
      location: "Test Location",
      slug: `dog-${startId + i}`,
      description: "A wonderful dog",
      traits: ["Friendly", "Playful"],
      energy_level: 3,
      special_characteristic: "Loves treats",
      quality_score: 0.8,
      created_at: new Date().toISOString(),
    }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should load initial batch of 20 dogs", async () => {
    const mockDogs = createMockDogs(20);
    mockFetchSwipeDogs.mockResolvedValueOnce(mockDogs);

    const { result } = renderHook(() => useSwipeQueue({ country: "US", sizes: [] }), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.queue).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetchSwipeDogs).toHaveBeenCalledWith({
      country: "US",
      sizes: [],
      limit: 20,
      offset: 0,
    });

    expect(result.current.queue).toHaveLength(20);
    expect(result.current.queue[0].name).toBe("Dog 1");
  });

  it("should preload when 5 dogs remain", async () => {
    const initialDogs = createMockDogs(20);
    const nextBatch = createMockDogs(20, 21);
    
    mockFetchSwipeDogs
      .mockResolvedValueOnce(initialDogs)
      .mockResolvedValueOnce(nextBatch);

    const { result } = renderHook(() => useSwipeQueue({ country: "US", sizes: [] }), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Remove dogs until only 5 remain
    for (let i = 0; i < 15; i++) {
      act(() => {
        result.current.removeFromQueue(initialDogs[i].id);
      });
    }

    await waitFor(() => {
      expect(mockFetchSwipeDogs).toHaveBeenCalledTimes(2);
    });

    expect(mockFetchSwipeDogs).toHaveBeenLastCalledWith({
      country: "US",
      sizes: [],
      limit: 20,
      offset: 20,
    });

    await waitFor(() => {
      expect(result.current.queue.length).toBeGreaterThan(5);
    });
  });

  it("should maintain max 30 dogs in memory", async () => {
    const initialDogs = createMockDogs(20);
    const secondBatch = createMockDogs(20, 21);
    const thirdBatch = createMockDogs(20, 41);
    
    mockFetchSwipeDogs
      .mockResolvedValueOnce(initialDogs)
      .mockResolvedValueOnce(secondBatch)
      .mockResolvedValueOnce(thirdBatch);

    const { result } = renderHook(() => useSwipeQueue({ country: "US", sizes: [] }), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Remove dogs to trigger preload
    for (let i = 0; i < 15; i++) {
      act(() => {
        result.current.removeFromQueue(initialDogs[i].id);
      });
    }

    await waitFor(() => {
      expect(result.current.queue.length).toBeLessThanOrEqual(30);
    });

    // Trigger another preload
    for (let i = 15; i < 20; i++) {
      act(() => {
        result.current.removeFromQueue(initialDogs[i].id);
      });
    }

    for (let i = 0; i < 15; i++) {
      act(() => {
        result.current.removeFromQueue(secondBatch[i].id);
      });
    }

    await waitFor(() => {
      expect(result.current.queue.length).toBeLessThanOrEqual(30);
    });

    // Queue should never exceed 30 dogs
    expect(result.current.queue.length).toBeLessThanOrEqual(30);
  });

  it("should handle API errors gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    mockFetchSwipeDogs.mockRejectedValueOnce(new Error("API Error"));

    const { result } = renderHook(() => useSwipeQueue({ country: "US", sizes: [] }), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to load dogs. Please try again.");
    expect(result.current.queue).toEqual([]);

    consoleErrorSpy.mockRestore();
  });

  it("should show empty state when no dogs", async () => {
    mockFetchSwipeDogs.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useSwipeQueue({ country: "US", sizes: [] }), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.queue).toEqual([]);
    expect(result.current.isEmpty).toBe(true);
  });

  it("should reload queue when filters change", async () => {
    const dogsUS = createMockDogs(10);
    const dogsUK = createMockDogs(10, 11);
    
    mockFetchSwipeDogs
      .mockResolvedValueOnce(dogsUS)
      .mockResolvedValueOnce(dogsUK);

    const { result, rerender } = renderHook(
      ({ filters }) => useSwipeQueue(filters),
      {
        wrapper,
        initialProps: { filters: { country: "US", sizes: [] } },
      }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.queue[0].name).toBe("Dog 1");

    // Change filters
    rerender({ filters: { country: "UK", sizes: [] } });

    await waitFor(() => {
      expect(mockFetchSwipeDogs).toHaveBeenCalledWith({
        country: "UK",
        sizes: [],
        limit: 20,
        offset: 0,
      });
    });

    await waitFor(() => {
      expect(result.current.queue[0].name).toBe("Dog 11");
    });
  });

  it("should handle size filters correctly", async () => {
    const mockDogs = createMockDogs(15);
    mockFetchSwipeDogs.mockResolvedValueOnce(mockDogs);

    const { result } = renderHook(
      () => useSwipeQueue({ country: "US", sizes: ["small", "medium"] }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetchSwipeDogs).toHaveBeenCalledWith({
      country: "US",
      sizes: ["small", "medium"],
      limit: 20,
      offset: 0,
    });
  });

  it("should deduplicate dogs in queue", async () => {
    const initialDogs = createMockDogs(10);
    const duplicateBatch = [...createMockDogs(5, 6), ...createMockDogs(5, 11)];
    
    mockFetchSwipeDogs
      .mockResolvedValueOnce(initialDogs)
      .mockResolvedValueOnce(duplicateBatch);

    const { result } = renderHook(() => useSwipeQueue({ country: "US", sizes: [] }), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Remove dogs to trigger preload
    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.removeFromQueue(initialDogs[i].id);
      });
    }

    await waitFor(() => {
      expect(mockFetchSwipeDogs).toHaveBeenCalledTimes(2);
    });

    // Check for unique IDs
    const uniqueIds = new Set(result.current.queue.map(dog => dog.id));
    expect(uniqueIds.size).toBe(result.current.queue.length);
  });

  it("should provide refetch function", async () => {
    const firstBatch = createMockDogs(10);
    const secondBatch = createMockDogs(10, 11);
    
    mockFetchSwipeDogs
      .mockResolvedValueOnce(firstBatch)
      .mockResolvedValueOnce(secondBatch);

    const { result } = renderHook(() => useSwipeQueue({ country: "US", sizes: [] }), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.queue[0].name).toBe("Dog 1");

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(mockFetchSwipeDogs).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(result.current.queue[0].name).toBe("Dog 11");
    });
  });

  it("should track loading state correctly", async () => {
    const mockDogs = createMockDogs(10);
    let resolvePromise: (value: any) => void;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    mockFetchSwipeDogs.mockReturnValueOnce(delayedPromise as any);

    const { result } = renderHook(() => useSwipeQueue({ country: "US", sizes: [] }), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.isPreloading).toBe(false);

    act(() => {
      resolvePromise!(mockDogs);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});