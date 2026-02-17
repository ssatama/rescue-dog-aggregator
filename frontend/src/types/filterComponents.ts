import type { OrganizationMetadata } from "./dogsPage";
import type { FilterCountsResponse } from "../schemas/common";

export interface FilterConfig {
  showAge: boolean;
  showBreed: boolean;
  showSort: boolean;
  showSize: boolean;
  showSex: boolean;
  showShipsTo: boolean;
  showOrganization: boolean;
  showSearch: boolean;
}

export interface SharedFilterProps {
  searchQuery: string;
  handleSearchChange: (value: string) => void;
  clearSearch: () => void;

  organizationFilter: string;
  setOrganizationFilter: (value: string) => void;
  organizations: OrganizationMetadata[];

  standardizedBreedFilter: string;
  setStandardizedBreedFilter: (value: string) => void;
  handleBreedSearch: (value: string) => void;
  handleBreedClear: () => void;
  handleBreedValueChange: (value: string) => void;
  standardizedBreeds: string[];

  sexFilter: string;
  setSexFilter: (value: string) => void;
  sexOptions: string[];

  sizeFilter: string;
  setSizeFilter: (value: string) => void;
  sizeOptions: string[];

  ageCategoryFilter: string;
  setAgeCategoryFilter: (value: string) => void;
  ageOptions: string[];

  availableCountryFilter: string;
  setAvailableCountryFilter: (value: string) => void;
  availableCountries: string[];

  resetFilters: () => void;
  filterCounts?: FilterCountsResponse | null;
}

export interface DesktopFiltersProps extends SharedFilterProps {
  locationCountryFilter: string;
  setLocationCountryFilter: (value: string) => void;
  locationCountries: string[];

  availableRegionFilter: string;
  setAvailableRegionFilter: (value: string) => void;
  availableRegions: string[];

  showBreed?: boolean;
}

export interface MobileFilterDrawerProps extends SharedFilterProps {
  isOpen: boolean;
  onClose: () => void;
  filterConfig?: FilterConfig;
  useSimpleBreedDropdown?: boolean;
  totalDogsCount: number;
}
