// Simple cache implementation for server-side request deduplication
// Since we're having issues with React.cache, we'll use a simple identity function
// Next.js will handle ISR caching with the 'next' option in fetch
const cache = (fn) => fn;

// Use internal URL for server-side requests in development
const API_URL =
  process.env.NODE_ENV === "development" && typeof window === "undefined"
    ? "http://localhost:8000" // Server-side in dev
    : process.env.NEXT_PUBLIC_API_URL || "https://api.rescuedogs.me";

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
  if (params.primary_breed) queryParams.append("primary_breed", params.primary_breed);
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
    const response = await fetch(`${API_URL}/api/animals/statistics`, {
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

// Breed statistics API fetch with caching
export const getBreedStats = cache(async () => {
  try {
    const response = await fetch(`${API_URL}/api/animals/breeds/stats`, {
      next: {
        revalidate: 3600, // Cache for 1 hour
        tags: ["breed-stats"],
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch breed stats: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching breed stats:", error);
    return {
      total_dogs: 0,
      unique_breeds: 0,
      breed_groups: {},
      qualifying_breeds: [],
      error: true,
    };
  }
});

// Animals by curation with caching
export const getAnimalsByCuration = cache(async (curationType, limit = 4) => {
  try {
    const queryParams = new URLSearchParams({
      curation_type: curationType,
      limit: limit.toString(),
      animal_type: "dog",
      status: "available",
    });

    const response = await fetch(
      `${API_URL}/api/animals/?${queryParams.toString()}`,
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

// Get breed-specific data
export const getBreedBySlug = cache(async (slug) => {
  try {
    const breedStats = await getBreedStats();
    const breedData = breedStats.qualifying_breeds?.find(breed => breed.breed_slug === slug);
    
    if (!breedData) {
      throw new Error(`Breed not found: ${slug}`);
    }
    
    const topDogs = await getAnimals({
      breed: breedData.primary_breed,
      limit: 6,
      sort_by: 'created_at',
      sort_order: 'desc'
    });
    
    const breedDescriptions = {
      'galgo': 'Spanish Greyhounds are gentle sighthounds known for their calm, affectionate nature. Despite their athletic build, they\'re surprisingly lazy, preferring short bursts of exercise followed by long naps.',
      'labrador-retriever': 'Labrador Retrievers are friendly, outgoing, and active companions who famously love water and retrieving games. They\'re excellent family dogs with a gentle nature.',
      'german-shepherd': 'German Shepherds are versatile, intelligent working dogs devoted to their family. They\'re confident, courageous, and excel at everything they\'re trained to do.',
      'mixed-breed': 'Mixed breed dogs combine the best traits of multiple breeds, often resulting in unique personalities and appearances. Each one is truly one-of-a-kind.',
      'podenco': 'Podencos are ancient Spanish hunting dogs with keen senses and athletic builds. They\'re intelligent, independent, and make loyal companions when given proper exercise.',
      'husky': 'Siberian Huskies are energetic, intelligent dogs bred for endurance in harsh climates. They\'re friendly, dignified, and known for their striking blue eyes.',
      'boxer': 'Boxers are playful, energetic dogs with patience and protective instincts. They\'re excellent with children and make devoted family guardians.',
      'beagle': 'Beagles are friendly, curious hounds with excellent noses and happy-go-lucky personalities. They\'re great with kids and other dogs.',
      'golden-retriever': 'Golden Retrievers are intelligent, friendly, and devoted companions. They\'re eager to please and excel as family dogs and service animals.',
      'pointer': 'Pointers are energetic, even-tempered dogs bred for hunting. They\'re loyal, hardworking, and make excellent companions for active families.'
    };
    
    return {
      ...breedData,
      breed_slug: slug, // Ensure breed_slug is included
      topDogs: topDogs.results || topDogs,
      description: breedDescriptions[slug] || `${breedData.primary_breed} dogs are wonderful companions looking for loving homes.`,
    };
  } catch (error) {
    console.error(`Error fetching breed data for ${slug}:`, error);
    throw error;
  }
});

export const getBreedDogs = cache(async (breedSlug, filters = {}) => {
  try {
    const breedStats = await getBreedStats();
    const breedData = breedStats.qualifying_breeds?.find(breed => breed.breed_slug === breedSlug);
    
    if (!breedData) {
      throw new Error(`Breed not found: ${breedSlug}`);
    }
    
    const params = {
      breed: breedData.primary_breed,
      limit: filters.limit || 12,
      offset: filters.offset || 0,
      ...filters
    };
    
    return getAnimals(params);
  } catch (error) {
    console.error(`Error fetching breed dogs for ${breedSlug}:`, error);
    return { results: [], total: 0 };
  }
});

export const getBreedFilterCounts = cache(async (breedSlug) => {
  try {
    const breedStats = await getBreedStats();
    const breedData = breedStats.qualifying_breeds?.find(breed => breed.breed_slug === breedSlug);
    
    if (!breedData) {
      return null;
    }
    
    return getFilterCounts({
      breed: breedData.primary_breed
    });
  } catch (error) {
    console.error(`Error fetching breed filter counts for ${breedSlug}:`, error);
    return null;
  }
});

// Get single animal by slug
// Get enhanced LLM content for dog detail pages
export const getEnhancedDogContent = cache(async (animalId) => {
  if (!animalId) return null;

  try {
    // Use query params as the API expects
    const url = `${API_URL}/api/animals/enhanced/detail-content?animal_ids=${animalId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      next: {
        revalidate: 300, // 5 minutes
        tags: ["enhanced", `animal-enhanced-${animalId}`],
      },
    });

    if (!response.ok) {
      console.warn(`Enhanced content not available for animal ${animalId}`);
      return null;
    }

    const data = await response.json();

    // API returns array, we need the first item
    const enhanced = data?.[0] || null;

    // Only return if has actual enhanced data
    if (
      enhanced?.has_enhanced_data &&
      (enhanced.description || enhanced.tagline)
    ) {
      return {
        description: enhanced.description,
        tagline: enhanced.tagline,
      };
    }

    return null;
  } catch (error) {
    console.error(
      `Error fetching enhanced content for animal ${animalId}:`,
      error,
    );
    return null; // Graceful fallback
  }
});

// Get single animal by slug
export const getAnimalBySlug = cache(async (slug) => {
  if (!slug) {
    throw new Error("Slug is required");
  }

  try {
    // First fetch the basic animal data
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

    const animal = await response.json();

    // Fetch enhanced content in parallel (non-blocking)
    // This won't delay the page if enhanced content is slow or unavailable
    try {
      const enhanced = await getEnhancedDogContent(animal.id);
      if (enhanced) {
        // Merge enhanced data into animal object
        animal.llm_description = enhanced.description;
        animal.llm_tagline = enhanced.tagline;
        animal.has_llm_data = true;
      }
    } catch (enhancedError) {
      // Silently fail - enhanced content is optional
      console.warn(`Enhanced content unavailable for ${slug}:`, enhancedError);
    }

    return animal;
  } catch (error) {
    console.error(`Error fetching animal ${slug}:`, error);
    throw error;
  }
});
