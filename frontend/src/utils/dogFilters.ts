import type { Dog } from "@/types/dog";
import { FILTER_DEFAULTS } from "@/constants/filters";

interface DogWithAgeFields extends Partial<Dog> {
  ageMinMonths?: number;
  ageMaxMonths?: number;
}

export interface Filters {
  age?: string;
  breed?: string;
  shipsTo?: string;
  sort?: string;
}

interface FilterOption {
  value: string;
  label: string;
}

export const filterByAge = (dogs: DogWithAgeFields[], ageFilter: string | undefined): DogWithAgeFields[] => {
  if (!dogs || !Array.isArray(dogs)) return [];
  if (!ageFilter || ageFilter === FILTER_DEFAULTS.ALL) return dogs;

  const filtered = dogs.filter((dog) => {
    if (!dog) return false;

    const ageMin = dog.age_min_months || dog.ageMinMonths;
    const ageMax = dog.age_max_months || dog.ageMaxMonths;

    if (ageFilter === "Unknown") {
      return !ageMin && !ageMax;
    }

    if (!ageMin && ageMin !== 0) return false;

    switch (ageFilter) {
      case "Puppy":
        return ageMax && ageMax < 12;
      case "Young":
        return (
          ageMin >= 12 &&
          ageMax !== null &&
          ageMax !== undefined &&
          ageMax <= 36
        );
      case "Adult":
        return (
          ageMin >= 36 &&
          ageMax !== null &&
          ageMax !== undefined &&
          ageMax <= 96
        );
      case "Senior":
        return ageMin >= 96;
      default:
        return false;
    }
  });

  return filtered;
};

export const filterByBreed = (dogs: Partial<Dog>[], breedFilter: string | undefined): Partial<Dog>[] => {
  if (!dogs || !Array.isArray(dogs)) return [];
  if (!breedFilter || breedFilter.trim() === "") return dogs;

  const searchTerm = breedFilter.toLowerCase().trim();

  return dogs.filter((dog) => {
    if (!dog) return false;

    const breed = (dog.standardized_breed || dog.breed || "").toLowerCase();
    return breed.includes(searchTerm);
  });
};

export const filterByLocation = (dogs: Partial<Dog>[], locationFilter: string | undefined): Partial<Dog>[] => {
  if (!dogs || !Array.isArray(dogs)) return [];
  if (!locationFilter || locationFilter === FILTER_DEFAULTS.ALL) return dogs;

  return dogs.filter((dog) => {
    if (!dog || !dog.organization) return false;

    const serviceRegions = dog.organization.service_regions || [];
    return serviceRegions.includes(locationFilter);
  });
};

export const filterByShipsTo = (dogs: Partial<Dog>[], shipsToFilter: string | undefined): Partial<Dog>[] => {
  if (!dogs || !Array.isArray(dogs)) return [];
  if (!shipsToFilter || shipsToFilter === FILTER_DEFAULTS.ALL) return dogs;

  return dogs.filter((dog) => {
    if (!dog || !dog.organization) return false;

    const shipsTo = dog.organization.ships_to || [];
    return shipsTo.includes(shipsToFilter);
  });
};

export const sortDogs = (dogs: Partial<Dog>[], sortBy: string | undefined): Partial<Dog>[] => {
  if (!dogs || !Array.isArray(dogs)) return [];

  const sortedDogs = [...dogs];

  switch (sortBy) {
    case "name-asc":
      return sortedDogs.sort((a, b) => {
        const nameA = (a?.name || "").toLowerCase();
        const nameB = (b?.name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

    case "name-desc":
      return sortedDogs.sort((a, b) => {
        const nameA = (a?.name || "").toLowerCase();
        const nameB = (b?.name || "").toLowerCase();
        return nameB.localeCompare(nameA);
      });

    case "newest":
    default:
      return sortedDogs.sort((a, b) => {
        const dateA = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b?.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
  }
};

export const applyAllFilters = (dogs: DogWithAgeFields[], filters: Filters | undefined, includeShipsTo = true): DogWithAgeFields[] => {
  if (!dogs || !Array.isArray(dogs)) return [];
  if (!filters) return dogs;

  let filteredDogs: DogWithAgeFields[] = dogs;

  filteredDogs = filterByAge(filteredDogs, filters.age);
  filteredDogs = filterByBreed(filteredDogs, filters.breed) as DogWithAgeFields[];

  if (includeShipsTo) {
    filteredDogs = filterByShipsTo(filteredDogs, filters.shipsTo) as DogWithAgeFields[];
  }

  filteredDogs = sortDogs(filteredDogs, filters.sort) as DogWithAgeFields[];

  return filteredDogs;
};

export const extractAvailableBreeds = (dogs: Partial<Dog>[]): string[] => {
  if (!dogs || !Array.isArray(dogs)) return [];

  const breeds = new Set<string>();

  dogs.forEach((dog) => {
    if (dog) {
      const breed = dog.standardized_breed || dog.breed;
      if (breed && breed !== "Unknown") {
        breeds.add(breed);
      }
    }
  });

  return Array.from(breeds).sort();
};

export const extractAvailableLocations = (dogs: Partial<Dog>[]): string[] => {
  if (!dogs || !Array.isArray(dogs)) return [];

  const locations = new Set<string>();

  dogs.forEach((dog) => {
    if (dog && dog.organization) {
      const serviceRegions = dog.organization.service_regions;
      if (serviceRegions) {
        serviceRegions.forEach((region) => {
          if (region) {
            locations.add(region);
          }
        });
      }
    }
  });

  return Array.from(locations).sort();
};

export const extractAvailableShipsTo = (dogs: Partial<Dog>[]): string[] => {
  if (!dogs || !Array.isArray(dogs)) return [];

  const shipsTo = new Set<string>();

  dogs.forEach((dog) => {
    if (dog && dog.organization && dog.organization.ships_to) {
      dog.organization.ships_to.forEach((country) => {
        if (country) {
          shipsTo.add(country);
        }
      });
    }
  });

  return Array.from(shipsTo).sort();
};

export const hasActiveFilters = (filters: Filters | undefined, includeShipsTo = true): boolean => {
  if (!filters) return false;

  return (
    (!!filters.age && filters.age !== FILTER_DEFAULTS.ALL) ||
    (!!filters.breed && filters.breed.trim() !== "") ||
    (includeShipsTo && !!filters.shipsTo && filters.shipsTo !== FILTER_DEFAULTS.ALL)
  );
};

export const getDefaultFilters = (): Filters => ({
  age: FILTER_DEFAULTS.ALL,
  breed: "",
  shipsTo: FILTER_DEFAULTS.ALL,
  sort: "newest",
});

export const getAgeFilterOptions = (): FilterOption[] => [
  { value: "All", label: "All Ages" },
  { value: "Puppy", label: "Puppy" },
  { value: "Young", label: "Young (1-3 years)" },
  { value: "Adult", label: "Adult (3-8 years)" },
  { value: "Senior", label: "Senior (8+ years)" },
  { value: "Unknown", label: "Age Unknown" },
];

export const getSortFilterOptions = (): FilterOption[] => [
  { value: "newest", label: "Newest First" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "oldest", label: "Oldest First" },
];
