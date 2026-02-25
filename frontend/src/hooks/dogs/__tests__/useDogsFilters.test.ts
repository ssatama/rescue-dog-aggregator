import { renderHook, act, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import useDogsFilters from "../useDogsFilters";
import { buildAPIParams } from "../useDogsFilters";
import * as animalsService from "../../../services/animalsService";
import * as logger from "../../../utils/logger";
import type { Filters, DogsPageMetadata, DogsPageInitialParams } from "../../../types/dogsPage";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("../../../services/animalsService", () => ({
  getAvailableRegions: jest.fn(),
}));

jest.mock("../../../utils/logger", () => ({
  reportError: jest.fn(),
}));

const mockRouter = { push: jest.fn(), replace: jest.fn() };

const defaultMetadata: DogsPageMetadata = {
  organizations: [{ id: 1, name: "Test Org" }, { id: 2, name: "Other Org" }],
  standardizedBreeds: ["Labrador", "Poodle"],
  locationCountries: ["Germany", "Spain"],
  availableCountries: ["Germany", "Finland"],
};

const defaultInitialParams: DogsPageInitialParams = {};

function renderDogsFilters(
  searchParams = new URLSearchParams(),
  {
    metadata = defaultMetadata,
    initialParams = defaultInitialParams,
    pathname = "/dogs",
  } = {},
) {
  const scrollPositionRef = { current: 0 };
  return renderHook(() =>
    useDogsFilters({
      metadata,
      initialParams,
      searchParams,
      pathname,
      scrollPositionRef,
    }),
  );
}

describe("useDogsFilters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (animalsService.getAvailableRegions as jest.Mock).mockResolvedValue([]);
  });

  describe("URL to filters parsing", () => {
    it("should parse empty search params to default filters", () => {
      const { result } = renderDogsFilters();

      expect(result.current.filters).toEqual({
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
      });
    });

    it("should parse search params to filters", () => {
      const searchParams = new URLSearchParams(
        "search=Rex&size=Large&age=Puppy&sex=Male&organization_id=1&breed=Labrador&breed_group=Sporting&location_country=Germany&available_country=Finland&available_region=Uusimaa",
      );
      const { result } = renderDogsFilters(searchParams);

      expect(result.current.filters).toEqual({
        searchQuery: "Rex",
        sizeFilter: "Large",
        ageFilter: "Puppy",
        sexFilter: "Male",
        organizationFilter: "1",
        breedFilter: "Labrador",
        breedGroupFilter: "Sporting",
        locationCountryFilter: "Germany",
        availableCountryFilter: "Finland",
        availableRegionFilter: "Uusimaa",
      });
    });

    it("should use initialParams as fallback for age and country filters", () => {
      const { result } = renderDogsFilters(new URLSearchParams(), {
        initialParams: {
          age_category: "Puppy",
          location_country: "Germany",
          available_country: "Finland",
        },
      });

      expect(result.current.filters.ageFilter).toBe("Puppy");
      expect(result.current.filters.locationCountryFilter).toBe("Germany");
      expect(result.current.filters.availableCountryFilter).toBe("Finland");
    });

    it("should validate organization_id against metadata", () => {
      const searchParams = new URLSearchParams("organization_id=999");
      const { result } = renderDogsFilters(searchParams);

      expect(result.current.filters.organizationFilter).toBe("any");
    });

    it("should accept valid organization_id from metadata", () => {
      const searchParams = new URLSearchParams("organization_id=1");
      const { result } = renderDogsFilters(searchParams);

      expect(result.current.filters.organizationFilter).toBe("1");
    });
  });

  describe("buildAPIParams", () => {
    it("should return empty params for default filters", () => {
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

      expect(buildAPIParams(defaultFilters)).toEqual({});
    });

    it("should map filter values to API parameter names", () => {
      const filters: Filters = {
        searchQuery: "Rex",
        sizeFilter: "Large",
        ageFilter: "Puppy",
        sexFilter: "Male",
        organizationFilter: "1",
        breedFilter: "Labrador",
        breedGroupFilter: "Sporting",
        locationCountryFilter: "Germany",
        availableCountryFilter: "Finland",
        availableRegionFilter: "Uusimaa",
      };

      expect(buildAPIParams(filters)).toEqual({
        search: "Rex",
        standardized_size: "Large",
        age_category: "Puppy",
        sex: "Male",
        organization_id: "1",
        standardized_breed: "Labrador",
        breed_group: "Sporting",
        location_country: "Germany",
        available_to_country: "Finland",
        available_to_region: "Uusimaa",
      });
    });

    it("should map 'Extra Large' size to 'XLarge' API value", () => {
      const filters: Filters = {
        searchQuery: "",
        sizeFilter: "Extra Large",
        ageFilter: "Any age",
        sexFilter: "Any",
        organizationFilter: "any",
        breedFilter: "Any breed",
        breedGroupFilter: "Any group",
        locationCountryFilter: "Any country",
        availableCountryFilter: "Any country",
        availableRegionFilter: "Any region",
      };

      expect(buildAPIParams(filters)).toEqual({
        standardized_size: "XLarge",
      });
    });

    it("should pass through size values that exist in SIZE_API_MAPPING unchanged", () => {
      const filters: Filters = {
        searchQuery: "",
        sizeFilter: "Small",
        ageFilter: "Any age",
        sexFilter: "Any",
        organizationFilter: "any",
        breedFilter: "Any breed",
        breedGroupFilter: "Any group",
        locationCountryFilter: "Any country",
        availableCountryFilter: "Any country",
        availableRegionFilter: "Any region",
      };

      expect(buildAPIParams(filters)).toEqual({
        standardized_size: "Small",
      });
    });

    it("should trim whitespace from values", () => {
      const filters: Filters = {
        searchQuery: "  Rex  ",
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

      expect(buildAPIParams(filters)).toEqual({ search: "Rex" });
    });
  });

  describe("updateURL", () => {
    it("should call router.push with mapped filter params", () => {
      jest.useFakeTimers();
      const { result } = renderDogsFilters();

      act(() => {
        result.current.updateURL(
          {
            searchQuery: "Rex",
            sizeFilter: "Any size",
            ageFilter: "Puppy",
            sexFilter: "Any",
            organizationFilter: "any",
            breedFilter: "Any breed",
            breedGroupFilter: "Any group",
            locationCountryFilter: "Any country",
            availableCountryFilter: "Any country",
            availableRegionFilter: "Any region",
          },
          1,
          false,
        );
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockRouter.push).toHaveBeenCalledWith(
        "/dogs?search=Rex&age=Puppy",
        { scroll: false },
      );

      jest.useRealTimers();
    });

    it("should include page param when page > 1", () => {
      jest.useFakeTimers();
      const { result } = renderDogsFilters();

      act(() => {
        result.current.updateURL(
          {
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
          },
          3,
          false,
        );
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockRouter.push).toHaveBeenCalledWith("/dogs?page=3", { scroll: false });

      jest.useRealTimers();
    });

    it("should include scroll param when preserveScroll is true and scroll > 0", () => {
      jest.useFakeTimers();
      const scrollPositionRef = { current: 500 };
      const { result } = renderHook(() =>
        useDogsFilters({
          metadata: defaultMetadata,
          initialParams: defaultInitialParams,
          searchParams: new URLSearchParams(),
          pathname: "/dogs",
          scrollPositionRef,
        }),
      );

      act(() => {
        result.current.updateURL(
          {
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
          },
          1,
          true,
        );
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining("scroll=500"),
        { scroll: false },
      );

      jest.useRealTimers();
    });
  });

  describe("activeFilterCount", () => {
    it("should return 0 for default filters", () => {
      const { result } = renderDogsFilters();
      expect(result.current.activeFilterCount).toBe(0);
    });

    it("should count active filters", () => {
      const searchParams = new URLSearchParams("search=Rex&size=Large&sex=Male");
      const { result } = renderDogsFilters(searchParams);
      expect(result.current.activeFilterCount).toBe(3);
    });
  });

  describe("availableRegions", () => {
    it("should default to ['Any region']", () => {
      const { result } = renderDogsFilters();
      expect(result.current.availableRegions).toEqual(["Any region"]);
    });

    it("should fetch regions when country is set", async () => {
      (animalsService.getAvailableRegions as jest.Mock).mockResolvedValue(["Uusimaa", "Helsinki"]);

      const searchParams = new URLSearchParams("available_country=Finland");
      const { result } = renderDogsFilters(searchParams);

      await waitFor(() => {
        expect(result.current.availableRegions).toEqual([
          "Any region",
          "Uusimaa",
          "Helsinki",
        ]);
      });
    });

    it("should reset regions when country is 'Any country'", () => {
      const { result } = renderDogsFilters();
      expect(result.current.availableRegions).toEqual(["Any region"]);
      expect(animalsService.getAvailableRegions).not.toHaveBeenCalled();
    });

    it("should fall back to ['Any region'] on getAvailableRegions error", async () => {
      (animalsService.getAvailableRegions as jest.Mock).mockRejectedValue(
        new Error("Network error"),
      );

      const searchParams = new URLSearchParams("available_country=Finland");
      const { result } = renderDogsFilters(searchParams);

      await waitFor(() => {
        expect(logger.reportError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({ context: "getAvailableRegions", country: "Finland" }),
        );
      });

      expect(result.current.availableRegions).toEqual(["Any region"]);
    });
  });
});
