export function getBreedFilterConfig(breedData) {
  return {
    showAge: true,
    showBreed: false, // Hide breed filter since we're already on a breed page
    showSort: false, // Simplified sorting for breed pages
    showSize: true,
    showSex: true,
    showShipsTo: true,
    showOrganization: true,
    showSearch: true, // Allow searching within breed (names, descriptions)
  };
}

export function getBreedFilterOptions(breedData, metadata) {
  return {
    // Standard options but filtered for breed context
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

    // Organizations that have this specific breed
    organizations: metadata?.organizations?.filter((org) =>
      breedData.organizations?.includes(org.id),
    ) || [{ id: "any", name: "Any Organization" }],

    // Countries where this breed is available
    availableCountries: breedData.available_countries || ["Any country"],
  };
}

export function getBreedEmptyStateConfig(breedData, hasFilters) {
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
