// Simple cache implementation for server-side request deduplication
// Since we're having issues with React.cache, we'll use a simple identity function
// Next.js will handle ISR caching with the 'next' option in fetch
const cache = (fn) => fn;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.rescuedogs.me";

// Cache functions for deduplication within request lifecycle
export const getAnimals = cache(async (params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.limit) queryParams.append("limit", params.limit);
  if (params.offset) queryParams.append("offset", params.offset);
  if (params.search) queryParams.append("search", params.search);
  if (params.size) queryParams.append("size", params.size);
  if (params.age) queryParams.append("age", params.age);
  if (params.sex) queryParams.append("sex", params.sex);
  if (params.organization_id)
    queryParams.append("organization_id", params.organization_id);
  if (params.breed) queryParams.append("breed", params.breed);
  if (params.location_country)
    queryParams.append("location_country", params.location_country);
  if (params.available_country)
    queryParams.append("available_country", params.available_country);
  if (params.available_region)
    queryParams.append("available_region", params.available_region);

  const url = `${API_URL}/api/animals/?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      next: {
        revalidate: 300, // ISR: revalidate every 5 minutes
        tags: ["animals"],
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch animals: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching animals:", error);
    return [];
  }
});

export const getStandardizedBreeds = cache(async () => {
  try {
    const response = await fetch(`${API_URL}/api/animals/meta/breeds/`, {
      next: {
        revalidate: 3600, // Cache for 1 hour
        tags: ["breeds"],
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch breeds: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching breeds:", error);
    return [];
  }
});

export const getLocationCountries = cache(async () => {
  try {
    const response = await fetch(
      `${API_URL}/api/animals/meta/location_countries`,
      {
        next: {
          revalidate: 3600,
          tags: ["location-countries"],
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch location countries: ${response.statusText}`,
      );
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching location countries:", error);
    return [];
  }
});

export const getAvailableCountries = cache(async () => {
  try {
    const response = await fetch(
      `${API_URL}/api/animals/meta/available_countries`,
      {
        next: {
          revalidate: 3600,
          tags: ["available-countries"],
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch available countries: ${response.statusText}`,
      );
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching available countries:", error);
    return [];
  }
});

export const getAvailableRegions = cache(async (country) => {
  if (!country || country === "Any country") {
    return [];
  }

  try {
    const response = await fetch(
      `${API_URL}/api/animals/meta/available-regions/?country=${encodeURIComponent(country)}`,
      {
        next: {
          revalidate: 3600,
          tags: ["available-regions", country],
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch regions: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching regions:", error);
    return [];
  }
});

export const getOrganizations = cache(async () => {
  try {
    const response = await fetch(`${API_URL}/api/organizations/`, {
      next: {
        revalidate: 3600,
        tags: ["organizations"],
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch organizations: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return [];
  }
});

export const getFilterCounts = cache(async (params = {}) => {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      queryParams.append(key, value);
    }
  });

  try {
    const response = await fetch(
      `${API_URL}/api/animals/meta/filter-counts/?${queryParams.toString()}`,
      {
        next: {
          revalidate: 60, // Cache for 1 minute
          tags: ["filter-counts"],
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch filter counts: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching filter counts:", error);
    return null;
  }
});

// Statistics API fetch with caching
export const getStatistics = cache(async () => {
  try {
    const response = await fetch(`${API_URL}/api/statistics/`, {
      next: {
        revalidate: 300, // 5 minutes
        tags: ["statistics"],
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch statistics: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return {
      total_dogs: 0,
      total_organizations: 0,
      total_countries: 0,
    };
  }
});

// Animals by curation with caching
export const getAnimalsByCuration = cache(async (curationType, limit = 4) => {
  try {
    const response = await fetch(
      `${API_URL}/api/animals/?curation=${curationType}&limit=${limit}`,
      {
        next: {
          revalidate: 300, // 5 minutes
          tags: ["animals", `curation-${curationType}`],
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${curationType} animals: ${response.statusText}`,
      );
    }

    return response.json();
  } catch (error) {
    console.error(`Error fetching ${curationType} animals:`, error);
    return [];
  }
});

// Optimized home page data fetch - parallel execution
export const getHomePageData = cache(async () => {
  try {
    // Fetch all data in parallel for maximum performance
    const [statistics, recentDogs, diverseDogs] = await Promise.all([
      getStatistics(),
      getAnimalsByCuration("recent_with_fallback", 4),
      getAnimalsByCuration("diverse", 4),
    ]);

    return {
      statistics,
      recentDogs,
      diverseDogs,
      // Add timestamp for debugging/monitoring
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching home page data:", error);

    // Return fallback data to prevent page crashes
    return {
      statistics: {
        total_dogs: 0,
        total_organizations: 0,
        total_countries: 0,
      },
      recentDogs: [],
      diverseDogs: [],
      fetchedAt: new Date().toISOString(),
      error: true,
    };
  }
});

// Combined metadata fetch for optimal performance
export const getAllMetadata = cache(async () => {
  try {
    const [breeds, locationCountries, availableCountries, organizations] =
      await Promise.all([
        getStandardizedBreeds(),
        getLocationCountries(),
        getAvailableCountries(),
        getOrganizations(),
      ]);

    return {
      standardizedBreeds: breeds
        ? ["Any breed", ...breeds.filter((b) => b !== "Any breed")]
        : ["Any breed"],
      locationCountries: locationCountries
        ? ["Any country", ...locationCountries]
        : ["Any country"],
      availableCountries: availableCountries
        ? ["Any country", ...availableCountries]
        : ["Any country"],
      organizations: organizations
        ? [
            { id: null, name: "Any organization" },
            ...(Array.isArray(organizations) ? organizations : []),
          ]
        : [{ id: null, name: "Any organization" }],
    };
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return {
      standardizedBreeds: ["Any breed"],
      locationCountries: ["Any country"],
      availableCountries: ["Any country"],
      organizations: [{ id: null, name: "Any organization" }],
    };
  }
});

// Get all animals for static generation
export const getAllAnimals = cache(async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    // Add common parameters for static generation
    if (params.limit) queryParams.append("limit", params.limit);
    else queryParams.append("limit", "1000"); // High limit for static generation

    if (params.offset) queryParams.append("offset", params.offset);

    const url = `${API_URL}/api/animals/?${queryParams.toString()}`;

    const response = await fetch(url, {
      next: {
        revalidate: 3600, // Cache for 1 hour
        tags: ["all-animals"],
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch all animals: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching all animals:", error);
    return [];
  }
});

// Get single animal by slug
export const getAnimalBySlug = cache(async (slug) => {
  if (!slug) {
    throw new Error("Slug is required");
  }

  try {
    const response = await fetch(`${API_URL}/api/animals/${slug}/`, {
      next: {
        revalidate: 300, // 5 minutes
        tags: ["animal", slug],
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Animal not found");
      }
      throw new Error(`Failed to fetch animal: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`Error fetching animal ${slug}:`, error);
    throw error;
  }
});
