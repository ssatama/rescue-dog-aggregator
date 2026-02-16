import { renderHook, act, waitFor } from "@testing-library/react";
import useDogsPagination from "../useDogsPagination";
import * as animalsService from "../../../services/animalsService";
import type { Filters, Dog } from "../../../types/dogsPage";

jest.mock("../../../services/animalsService", () => ({
  getAnimals: jest.fn(),
  getFilterCounts: jest.fn(),
}));

jest.mock("../../../utils/logger", () => ({
  reportError: jest.fn(),
}));

const defaultFilters: Filters = {
  searchQuery: "",
  sizeFilter: "Any size",
  ageFilter: "Any age",
  sexFilter: "Any",
  organizationFilter: "any",
  breedFilter: "Any breed",
  breedGroupFilter: "Any group",
  locationCountryFilter: "Any country",
  availableCountryFilter: "Any country",
  availableRegionFilter: "Any region",
};

const mockBuildAPIParams = jest.fn().mockReturnValue({});

function makeDogs(count: number, startId = 1): Dog[] {
  return Array.from({ length: count }, (_, i) => ({
    id: startId + i,
    name: `Dog ${startId + i}`,
  }));
}

function renderPagination({
  initialDogs = [] as Dog[],
  initialParams = {},
  filters = defaultFilters,
  searchParams = new URLSearchParams(),
  pathname = "/dogs",
} = {}) {
  const scrollPositionRef = { current: 0 };

  return renderHook(() =>
    useDogsPagination({
      initialDogs,
      initialParams,
      filters,
      buildAPIParams: mockBuildAPIParams,
      scrollPositionRef,
      searchParams,
      pathname,
    }),
  );
}

describe("useDogsPagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (animalsService.getAnimals as jest.Mock).mockResolvedValue([]);
    (animalsService.getFilterCounts as jest.Mock).mockResolvedValue({});
  });

  describe("initial state", () => {
    it("should use initialDogs for page 1 with no URL filters", () => {
      const dogs = makeDogs(5);
      const { result } = renderPagination({ initialDogs: dogs });

      expect(result.current.dogs).toEqual(dogs);
    });

    it("should start empty when URL has filters", () => {
      const dogs = makeDogs(5);
      const searchParams = new URLSearchParams("size=Large");
      const { result } = renderPagination({ initialDogs: dogs, searchParams });

      expect(result.current.dogs).toEqual([]);
    });

    it("should start empty when URL page > 1", () => {
      const dogs = makeDogs(5);
      const searchParams = new URLSearchParams("page=2");
      const { result } = renderPagination({ initialDogs: dogs, searchParams });

      expect(result.current.dogs).toEqual([]);
    });

    it("should set hasMore based on initialDogs count matching page size", () => {
      const dogs20 = makeDogs(20);
      const { result: result20 } = renderPagination({ initialDogs: dogs20 });
      expect(result20.current.hasMore).toBe(true);

      const dogs5 = makeDogs(5);
      const { result: result5 } = renderPagination({ initialDogs: dogs5 });
      expect(result5.current.hasMore).toBe(false);
    });

    it("should start with page from URL", () => {
      const searchParams = new URLSearchParams("page=3");
      const { result } = renderPagination({ searchParams });
      expect(result.current.page).toBe(3);
    });

    it("should default page to 1 for NaN page param", () => {
      const searchParams = new URLSearchParams("page=abc");
      const { result } = renderPagination({ searchParams });
      expect(result.current.page).toBe(1);
    });
  });

  describe("initial load", () => {
    it("should fetch dogs on mount when initialDogs is empty", async () => {
      const fetchedDogs = makeDogs(10);
      (animalsService.getAnimals as jest.Mock).mockResolvedValue(fetchedDogs);
      (animalsService.getFilterCounts as jest.Mock).mockResolvedValue({ total: 10 });

      const { result } = renderPagination();

      await waitFor(() => {
        expect(result.current.dogs).toEqual(fetchedDogs);
      });

      expect(animalsService.getAnimals).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20, offset: 0 }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it("should hydrate deep link pages when URL page > 1", async () => {
      const page1Dogs = makeDogs(20, 1);
      const page2Dogs = makeDogs(20, 21);

      (animalsService.getAnimals as jest.Mock)
        .mockResolvedValueOnce(page1Dogs)
        .mockResolvedValueOnce(page2Dogs);
      (animalsService.getFilterCounts as jest.Mock).mockResolvedValue({});

      const searchParams = new URLSearchParams("page=2");
      const { result } = renderPagination({ searchParams });

      await waitFor(() => {
        expect(result.current.dogs).toHaveLength(40);
      });

      expect(animalsService.getAnimals).toHaveBeenCalledTimes(2);

      expect(animalsService.getAnimals).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0 }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(animalsService.getAnimals).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 20 }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  describe("fetchDogsWithFilters", () => {
    it("should replace dogs on non-append fetch", async () => {
      const initialDogs = makeDogs(5);
      const newDogs = makeDogs(3, 100);
      (animalsService.getAnimals as jest.Mock)
        .mockResolvedValueOnce([]) // mount fetch
        .mockResolvedValueOnce(newDogs);
      (animalsService.getFilterCounts as jest.Mock).mockResolvedValue({});

      const { result } = renderPagination({ initialDogs });

      await act(async () => {
        await result.current.fetchDogsWithFilters(defaultFilters, 1);
      });

      expect(result.current.dogs).toEqual(newDogs);
    });

    it("should append dogs when shouldAppend is true", async () => {
      const page1 = makeDogs(20);
      const page2 = makeDogs(5, 21);

      (animalsService.getAnimals as jest.Mock)
        .mockResolvedValueOnce(page1) // mount fetch
        .mockResolvedValueOnce(page2);
      (animalsService.getFilterCounts as jest.Mock).mockResolvedValue({});

      const { result } = renderPagination();

      await waitFor(() => {
        expect(result.current.dogs).toHaveLength(20);
      });

      await act(async () => {
        await result.current.fetchDogsWithFilters(defaultFilters, 2, true);
      });

      expect(result.current.dogs).toHaveLength(25);
    });

    it("should set hasMore to false when fewer than 20 dogs returned", async () => {
      const fewDogs = makeDogs(5);
      (animalsService.getAnimals as jest.Mock).mockResolvedValue(fewDogs);
      (animalsService.getFilterCounts as jest.Mock).mockResolvedValue({});

      const { result } = renderPagination();

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });
    });

    it("should handle fetch errors", async () => {
      (animalsService.getAnimals as jest.Mock).mockRejectedValue(new Error("Network error"));
      (animalsService.getFilterCounts as jest.Mock).mockRejectedValue(new Error("Network error"));

      const { result } = renderPagination();

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to load dogs");
      });
    });

    it("should not set error for AbortError", async () => {
      const abortError = new DOMException("The operation was aborted", "AbortError");
      (animalsService.getAnimals as jest.Mock).mockRejectedValue(abortError);
      (animalsService.getFilterCounts as jest.Mock).mockRejectedValue(abortError);

      const { result } = renderPagination();

      // Give it time to process - AbortError should be silently handled
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("loadMoreDogs", () => {
    it("should append next page of dogs", async () => {
      const page1 = makeDogs(20);
      const page2 = makeDogs(10, 21);

      // Mount effect always fires fetchDogsWithFilters (filters !== initialParams)
      // Mock order: 1st call = mount fetch, 2nd call = loadMore
      (animalsService.getAnimals as jest.Mock)
        .mockResolvedValueOnce(page1)  // mount fetchDogsWithFilters replaces dogs
        .mockResolvedValueOnce(page2); // loadMore appends
      (animalsService.getFilterCounts as jest.Mock).mockResolvedValue({});

      const { result } = renderPagination({ initialDogs: page1 });

      // Wait for mount fetch to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.dogs).toHaveLength(20);
      });

      await act(async () => {
        await result.current.loadMoreDogs();
      });

      // 20 from mount fetch + 10 from loadMore = 30
      expect(result.current.dogs).toHaveLength(30);
      expect(result.current.page).toBe(2);
    });

    it("should guard against concurrent calls via loadingMore", async () => {
      const page1 = makeDogs(20);
      const page2 = makeDogs(20, 21);

      // Mount fetch returns page1, then loadMore returns page2
      (animalsService.getAnimals as jest.Mock)
        .mockResolvedValueOnce(page1)  // mount fetch
        .mockResolvedValueOnce(page2); // single loadMore call (second is guarded)
      (animalsService.getFilterCounts as jest.Mock).mockResolvedValue({});

      const { result } = renderPagination({ initialDogs: page1 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.dogs).toHaveLength(20);
      });

      // Start two concurrent loadMore calls - second should be guarded by isPaginatingRef
      await act(async () => {
        const first = result.current.loadMoreDogs();
        const second = result.current.loadMoreDogs();
        await Promise.all([first, second]);
      });

      // Only one loadMore should have executed
      expect(result.current.page).toBe(2);
      // mount fetch (1) + loadMore (1) = 2 total getAnimals calls
      expect(animalsService.getAnimals).toHaveBeenCalledTimes(2);
    });

    it("should not load when hasMore is false", async () => {
      const fewDogs = makeDogs(5);
      (animalsService.getAnimals as jest.Mock).mockResolvedValue(fewDogs);
      (animalsService.getFilterCounts as jest.Mock).mockResolvedValue({});

      const { result } = renderPagination({ initialDogs: fewDogs });

      // hasMore is false because 5 < 20
      expect(result.current.hasMore).toBe(false);

      const callsBefore = (animalsService.getAnimals as jest.Mock).mock.calls.length;

      await act(async () => {
        await result.current.loadMoreDogs();
      });

      // No additional API calls
      expect((animalsService.getAnimals as jest.Mock).mock.calls.length).toBe(callsBefore);
    });

    it("should set error on loadMoreDogs failure", async () => {
      const page1 = makeDogs(20);

      (animalsService.getAnimals as jest.Mock)
        .mockResolvedValueOnce(page1)
        .mockRejectedValueOnce(new Error("Network error"));
      (animalsService.getFilterCounts as jest.Mock).mockResolvedValue({});

      const { result } = renderPagination({ initialDogs: page1 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.dogs).toHaveLength(20);
      });

      await act(async () => {
        await result.current.loadMoreDogs();
      });

      expect(result.current.error).toBe("Failed to load more dogs");
      expect(result.current.loadingMore).toBe(false);
    });

    it("should update URL via history.replaceState after loadMore", async () => {
      const replaceStateSpy = jest.spyOn(window.history, "replaceState");
      const page1 = makeDogs(20);
      const page2 = makeDogs(10, 21);

      (animalsService.getAnimals as jest.Mock)
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);
      (animalsService.getFilterCounts as jest.Mock).mockResolvedValue({});

      const { result } = renderPagination({ initialDogs: page1 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.dogs).toHaveLength(20);
      });

      replaceStateSpy.mockClear();

      await act(async () => {
        await result.current.loadMoreDogs();
      });

      expect(replaceStateSpy).toHaveBeenCalledWith(
        null,
        "",
        expect.stringContaining("page=2"),
      );

      replaceStateSpy.mockRestore();
    });
  });

  describe("abort", () => {
    it("should abort ongoing fetch on unmount", async () => {
      let abortSignal: AbortSignal | undefined;
      (animalsService.getAnimals as jest.Mock).mockImplementation((_params, options) => {
        abortSignal = options?.signal;
        return new Promise((resolve) => setTimeout(() => resolve([]), 1000));
      });
      (animalsService.getFilterCounts as jest.Mock).mockImplementation((_params, options) => {
        return new Promise((resolve) => setTimeout(() => resolve({}), 1000));
      });

      const { unmount } = renderPagination();

      // Wait for fetch to start
      await waitFor(() => {
        expect(animalsService.getAnimals).toHaveBeenCalled();
      });

      unmount();

      expect(abortSignal?.aborted).toBe(true);
    });

    it("should expose abortCurrentFetch for external abort", async () => {
      (animalsService.getAnimals as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => setTimeout(() => resolve([]), 1000));
      });
      (animalsService.getFilterCounts as jest.Mock).mockResolvedValue({});

      const { result } = renderPagination();

      await waitFor(() => {
        expect(animalsService.getAnimals).toHaveBeenCalled();
      });

      act(() => {
        result.current.abortCurrentFetch();
      });

      // Should not throw, just cancel
      expect(result.current.error).toBeNull();
    });
  });

  describe("isFilterTransition", () => {
    it("should be false by default", () => {
      const page1 = makeDogs(20);
      const { result } = renderPagination({ initialDogs: page1 });

      expect(result.current.isFilterTransition).toBe(false);
    });
  });
});
