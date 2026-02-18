interface BreedData {
  primary_breed?: string;
  organizations?: (number | string)[];
  available_countries?: string[];
}

interface FilterMetadata {
  organizations?: { id: number | string; name: string }[];
}

interface FilterConfig {
  showAge: boolean;
  showBreed: boolean;
  showSort: boolean;
  showSize: boolean;
  showSex: boolean;
  showShipsTo: boolean;
  showOrganization: boolean;
  showSearch: boolean;
}

interface FilterOptions {
  sexOptions: string[];
  sizeOptions: string[];
  ageOptions: string[];
  organizations: { id: number | string; name: string }[];
  availableCountries: string[];
}

interface EmptyStateConfig {
  title: string;
  description: string;
  actionLabel: string;
  variant: string;
}

export function getBreedFilterConfig(_breedData: BreedData): FilterConfig {
  return {
    showAge: true,
    showBreed: false,
    showSort: false,
    showSize: true,
    showSex: true,
    showShipsTo: true,
    showOrganization: true,
    showSearch: true,
  };
}

export function getBreedFilterOptions(breedData: BreedData, metadata?: FilterMetadata): FilterOptions {
  return {
    sexOptions: ["Any", "Male", "Female"],
    sizeOptions: [
      "Any size",
      "Tiny",
      "Small",
      "Medium",
      "Large",
      "Extra Large",
    ],
    ageOptions: ["Any age", "Puppy", "Young", "Adult", "Senior"],

    organizations: metadata?.organizations?.filter((org) =>
      breedData.organizations?.includes(org.id),
    ) || [{ id: "any", name: "Any Organization" }],

    availableCountries: breedData.available_countries || ["Any country"],
  };
}

export function getBreedEmptyStateConfig(breedData: BreedData, hasFilters: boolean): EmptyStateConfig {
  if (hasFilters) {
    return {
      title: `No ${breedData.primary_breed}s match your filters`,
      description: `Try adjusting your filters to see more ${breedData.primary_breed} rescue dogs.`,
      actionLabel: "Clear filters",
      variant: "noResults",
    };
  }

  return {
    title: `No ${breedData.primary_breed}s available`,
    description: `There are currently no ${breedData.primary_breed} dogs available for adoption. Save a breed alert to be notified when new ${breedData.primary_breed}s become available.`,
    actionLabel: "Save Breed Alert",
    variant: "noDogsBreed",
  };
}
