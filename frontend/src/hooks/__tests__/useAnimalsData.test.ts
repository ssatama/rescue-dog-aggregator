import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useAnimalsInfinite, useFilterCounts } from "../useAnimalsData";
import * as animalsService from "../../services/animalsService";
import * as logger from "../../utils/logger";

jest.mock("../../services/animalsService", () => ({
  getAnimals: jest.fn(),
  getFilterCounts: jest.fn(),
}));

jest.mock("../../utils/logger", () => ({
  reportError: jest.fn(),
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockedGetAnimals = animalsService.getAnimals as jest.MockedFunction<typeof animalsService.getAnimals>;
const mockedGetFilterCounts = animalsService.getFilterCounts as jest.MockedFunction<typeof animalsService.getFilterCounts>;
const mockedReportError = logger.reportError as jest.MockedFunction<typeof logger.reportError>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
  const TestWrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  TestWrapper.displayName = "TestWrapper";
  return TestWrapper;
};

const mockDog = (id: number) => ({
  id,
  name: `Dog ${id}`,
  slug: `dog-${id}`,
  breed: "Labrador",
});

describe("useAnimalsInfinite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should return initial loading state", () => {
      mockedGetAnimals.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useAnimalsInfinite({}), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.dogs).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it("should use initialData when provided", () => {
      const initialDogs = [mockDog(1), mockDog(2)];
      mockedGetAnimals.mockResolvedValue([]);

      const { result } = renderHook(() => useAnimalsInfinite({}, initialDogs), {
        wrapper: createWrapper(),
      });

      expect(result.current.dogs).toEqual(initialDogs);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Data Fetching", () => {
    it("should fetch and return dogs successfully", async () => {
      const mockDogs = [mockDog(1), mockDog(2), mockDog(3)];
      mockedGetAnimals.mockResolvedValue(mockDogs);

      const { result } = renderHook(() => useAnimalsInfinite({}), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.dogs).toEqual(mockDogs);
      expect(result.current.error).toBeNull();
    });

    it("should pass apiParams to getAnimals", async () => {
      const apiParams = { standardized_breed: "Labrador", sex: "Male" };
      mockedGetAnimals.mockResolvedValue([mockDog(1)]);

      const { result } = renderHook(() => useAnimalsInfinite(apiParams), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedGetAnimals).toHaveBeenCalledWith(
        expect.objectContaining({
          standardized_breed: "Labrador",
          sex: "Male",
          limit: 20,
          offset: 0,
        })
      );
    });
  });

  describe("Pagination", () => {
    it("should set hasMore correctly when less than page size returned", async () => {
      const mockDogs = [mockDog(1), mockDog(2)];
      mockedGetAnimals.mockResolvedValue(mockDogs);

      const { result } = renderHook(() => useAnimalsInfinite({}), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isReachingEnd).toBe(true);
    });

    it("should set hasMore correctly when full page returned", async () => {
      const mockDogs = Array.from({ length: 20 }, (_, i) => mockDog(i + 1));
      mockedGetAnimals.mockResolvedValue(mockDogs);

      const { result } = renderHook(() => useAnimalsInfinite({}), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isReachingEnd).toBe(false);
    });

    it("should load more dogs when loadMore is called", async () => {
      const page1 = Array.from({ length: 20 }, (_, i) => mockDog(i + 1));
      const page2 = Array.from({ length: 20 }, (_, i) => mockDog(i + 21));

      mockedGetAnimals
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const { result } = renderHook(() => useAnimalsInfinite({}), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.dogs).toHaveLength(20);

      result.current.loadMore();

      await waitFor(() => {
        expect(result.current.dogs).toHaveLength(40);
      });

      expect(mockedGetAnimals).toHaveBeenCalledTimes(2);
      expect(mockedGetAnimals).toHaveBeenLastCalledWith(
        expect.objectContaining({
          offset: 20,
        })
      );
    });

    it("should return correct size value", async () => {
      const page1 = Array.from({ length: 20 }, (_, i) => mockDog(i + 1));
      const page2 = Array.from({ length: 10 }, (_, i) => mockDog(i + 21));

      mockedGetAnimals
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const { result } = renderHook(() => useAnimalsInfinite({}), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.size).toBe(1);

      result.current.loadMore();

      await waitFor(() => {
        expect(result.current.size).toBe(2);
      });
    });
  });

  describe("Error Handling", () => {
    it("should report error on fetch failure", async () => {
      const testError = new Error("Network error");
      mockedGetAnimals.mockRejectedValue(testError);

      const { result } = renderHook(() => useAnimalsInfinite({ search: "test" }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(mockedReportError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          context: "useAnimalsInfinite",
          pageParam: 0,
        })
      );
    });

    it("should include apiParams in error context", async () => {
      const testError = new Error("API error");
      const apiParams = { breed: "Labrador" };
      mockedGetAnimals.mockRejectedValue(testError);

      const { result } = renderHook(() => useAnimalsInfinite(apiParams), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(mockedReportError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          apiParams: JSON.stringify(apiParams),
        })
      );
    });
  });

  describe("Refresh", () => {
    it("should refetch data when refresh is called", async () => {
      const initialDogs = [mockDog(1)];
      const refreshedDogs = [mockDog(1), mockDog(2)];

      mockedGetAnimals
        .mockResolvedValueOnce(initialDogs)
        .mockResolvedValueOnce(refreshedDogs);

      const { result } = renderHook(() => useAnimalsInfinite({}), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.dogs).toEqual(initialDogs);

      result.current.refresh();

      await waitFor(() => {
        expect(mockedGetAnimals).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Empty State", () => {
    it("should handle empty response correctly", async () => {
      mockedGetAnimals.mockResolvedValue([]);

      const { result } = renderHook(() => useAnimalsInfinite({}), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.dogs).toEqual([]);
      expect(result.current.isReachingEnd).toBe(true);
    });
  });
});

describe("useFilterCounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Disabled Query", () => {
    it("should not fetch when apiParams is null", async () => {
      const { result } = renderHook(() => useFilterCounts(null), {
        wrapper: createWrapper(),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockedGetFilterCounts).not.toHaveBeenCalled();
      expect(result.current.filterCounts).toBeUndefined();
      expect(result.current.filterCountsLoading).toBe(false);
    });
  });

  describe("Data Fetching", () => {
    it("should fetch filter counts successfully", async () => {
      const mockCounts = {
        size: { Small: 10, Medium: 20, Large: 15 },
        age: { Puppy: 5, Adult: 30 },
      };
      mockedGetFilterCounts.mockResolvedValue(mockCounts);

      const { result } = renderHook(() => useFilterCounts({}), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.filterCountsLoading).toBe(false);
      });

      expect(result.current.filterCounts).toEqual(mockCounts);
      expect(result.current.filterCountsError).toBeNull();
    });

    it("should pass apiParams to getFilterCounts", async () => {
      const apiParams = { standardized_breed: "Labrador" };
      mockedGetFilterCounts.mockResolvedValue({});

      const { result } = renderHook(() => useFilterCounts(apiParams), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.filterCountsLoading).toBe(false);
      });

      expect(mockedGetFilterCounts).toHaveBeenCalledWith(apiParams);
    });
  });

  describe("Error Handling", () => {
    it("should report error on fetch failure", async () => {
      const testError = new Error("Filter counts error");
      mockedGetFilterCounts.mockRejectedValue(testError);

      const { result } = renderHook(() => useFilterCounts({ search: "test" }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.filterCountsError).not.toBeNull();
      });

      expect(mockedReportError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          context: "useFilterCounts",
        })
      );
    });

    it("should include apiParams in error context", async () => {
      const testError = new Error("API error");
      const apiParams = { breed: "Labrador" };
      mockedGetFilterCounts.mockRejectedValue(testError);

      const { result } = renderHook(() => useFilterCounts(apiParams), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.filterCountsError).not.toBeNull();
      });

      expect(mockedReportError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          apiParams: JSON.stringify(apiParams),
        })
      );
    });
  });

  describe("Refresh", () => {
    it("should refetch when refreshFilterCounts is called", async () => {
      const initialCounts = { size: { Small: 10 } };
      const refreshedCounts = { size: { Small: 15, Medium: 5 } };

      mockedGetFilterCounts
        .mockResolvedValueOnce(initialCounts)
        .mockResolvedValueOnce(refreshedCounts);

      const { result } = renderHook(() => useFilterCounts({}), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.filterCountsLoading).toBe(false);
      });

      expect(result.current.filterCounts).toEqual(initialCounts);

      result.current.refreshFilterCounts();

      await waitFor(() => {
        expect(mockedGetFilterCounts).toHaveBeenCalledTimes(2);
      });
    });
  });
});
