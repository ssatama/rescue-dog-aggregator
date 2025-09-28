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
  if (params.breed_type) queryParams.append("breed_type", params.breed_type);
  if (params.breed_group) queryParams.append("breed_group", params.breed_group);
  if (params.primary_breed)
    queryParams.append("primary_breed", params.primary_breed);
  if (params.location_country)
    queryParams.append("location_country", params.location_country);
  if (params.available_country)
    queryParams.append("available_country", params.available_country);
  if (params.available_region)
    queryParams.append("available_region", params.available_region);
  if (params.sort_by) queryParams.append("sort_by", params.sort_by);
  if (params.sort_order) queryParams.append("sort_order", params.sort_order);

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
    return { results: [], total: 0 };
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

    const data = await response.json();

    // Inline validation to ensure breed_groups is always an array
    if (data) {
      if (data.breed_groups && !Array.isArray(data.breed_groups)) {
        data.breed_groups = [];
      }
      if (data.qualifying_breeds && !Array.isArray(data.qualifying_breeds)) {
        data.qualifying_breeds = [];
      }
      data.total_dogs = Number(data.total_dogs) || 0;
      data.unique_breeds = Number(data.unique_breeds) || 0;
      data.purebred_count = Number(data.purebred_count) || 0;
      data.crossbreed_count = Number(data.crossbreed_count) || 0;
    }

    return data;
  } catch (error) {
    console.error("Error fetching breed stats:", error);
    return {
      total_dogs: 0,
      unique_breeds: 0,
      breed_groups: [],
      qualifying_breeds: [],
      purebred_count: 0,
      crossbreed_count: 0,
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
      getAnimalsByCuration("recent_with_fallback", 8), // Changed from 4 to 8 for mobile
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
    // Special handling for mixed breeds
    if (slug === "mixed") {
      const breedStats = await getBreedStats();
      const mixedGroup = breedStats.breed_groups?.find(
        (g) => g.name === "Mixed",
      );

      // Get a diverse sample of mixed breed dogs for the gallery
      const topDogs = await getAnimals({
        breed_group: "Mixed",
        limit: 6,
        sort_by: "created_at",
        sort_order: "desc",
      });

      // Get a sample for accurate statistics (limited by Next.js cache size)
      const allMixedDogs = await getAnimals({
        breed_group: "Mixed",
        limit: 200, // Balanced sample size for statistics within cache limits
      });

      const dogsArray = allMixedDogs.results || allMixedDogs || [];

      // Get organization and country data from breed stats
      // Mixed breeds are tracked in breed_groups which includes aggregate data
      const organizationSet = new Set();
      const countrySet = new Set();

      // Also get counts from the breed stats if available
      let statsOrgCount = 0;
      let statsCountryCount = 0;

      // Check if breed stats has organization/country data for mixed breeds
      if (breedStats?.qualifying_breeds) {
        // Count orgs and countries that have mixed breeds
        breedStats.qualifying_breeds.forEach((breed) => {
          if (breed.breed_group === "Mixed" || breed.breed_type === "mixed") {
            if (breed.organizations) {
              breed.organizations.forEach((org) => organizationSet.add(org));
            }
            if (breed.countries) {
              breed.countries.forEach((country) => countrySet.add(country));
            }
          }
        });
      }

      // Aggregate personality data
      const personalityAggregation = {
        energy_level: 0,
        affection: 0,
        trainability: 0,
        independence: 0,
      };

      const personalityCount = {
        energy_level: 0,
        affection: 0,
        trainability: 0,
        independence: 0,
      };

      // Collect personality traits
      const traitsMap = new Map();

      // Age calculations
      let totalAgeMonths = 0;
      let ageCount = 0;
      let minAge = Infinity;
      let maxAge = 0;

      dogsArray.forEach((dog) => {
        // Collect organization data
        if (dog.organization_id) {
          organizationSet.add(dog.organization_id);
        }

        // Collect country data - try multiple sources
        if (dog.organization?.country) {
          countrySet.add(dog.organization.country);
        } else if (dog.available_country) {
          countrySet.add(dog.available_country);
        } else if (dog.country) {
          countrySet.add(dog.country);
        }

        // Calculate age statistics
        if (dog.age_min_months && dog.age_max_months) {
          const avgAge = (dog.age_min_months + dog.age_max_months) / 2;
          totalAgeMonths += avgAge;
          ageCount++;
          minAge = Math.min(minAge, dog.age_min_months);
          maxAge = Math.max(maxAge, dog.age_max_months);
        }

        if (dog.properties) {
          // Aggregate numeric personality scores
          ["energy_level", "affection", "trainability", "independence"].forEach(
            (trait) => {
              if (
                dog.properties[trait] !== undefined &&
                dog.properties[trait] !== null
              ) {
                const value = Number(dog.properties[trait]);
                if (!isNaN(value) && value >= 0 && value <= 100) {
                  personalityAggregation[trait] += value;
                  personalityCount[trait]++;
                }
              }
            },
          );

          // Collect traits for frequency analysis
          if (dog.properties.personality_traits) {
            const traits = Array.isArray(dog.properties.personality_traits)
              ? dog.properties.personality_traits
              : [dog.properties.personality_traits];
            traits.forEach((trait) => {
              if (trait && typeof trait === "string") {
                traitsMap.set(trait, (traitsMap.get(trait) || 0) + 1);
              }
            });
          }
        }
      });

      // Calculate averages for personality scores
      const personalityProfile = {};
      const personalityMetrics = {};

      Object.keys(personalityAggregation).forEach((trait) => {
        let percentage;
        if (personalityCount[trait] > 0) {
          percentage = Math.round(
            personalityAggregation[trait] / personalityCount[trait],
          );
        } else {
          // Default values if no data
          percentage =
            trait === "energy_level"
              ? 60
              : trait === "affection"
                ? 80
                : trait === "trainability"
                  ? 70
                  : trait === "independence"
                    ? 50
                    : 50;
        }

        personalityProfile[trait] = percentage;

        // Format for PersonalityBarChart component
        let label;
        if (percentage <= 20) label = "Very Low";
        else if (percentage <= 40) label = "Low";
        else if (percentage <= 60) label = "Medium";
        else if (percentage <= 80) label = "High";
        else label = "Very High";

        personalityMetrics[trait] = {
          percentage,
          label,
        };
      });

      // Get most common traits (top 10)
      const commonTraits = Array.from(traitsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([trait]) => trait);

      // If no traits found, provide defaults
      if (commonTraits.length === 0) {
        commonTraits.push("Affectionate", "Gentle", "Loyal", "Smart", "Loving");
      }

      // Calculate experience level distribution
      const experienceMap = new Map();
      dogsArray.forEach((dog) => {
        if (dog.properties?.experience_level) {
          const level = dog.properties.experience_level;
          experienceMap.set(level, (experienceMap.get(level) || 0) + 1);
        }
      });

      const experienceDistribution = Array.from(experienceMap.entries()).map(
        ([level, count]) => ({
          level,
          count,
          percentage: Math.round((count / dogsArray.length) * 100),
        }),
      );

      // Calculate age distribution
      const ageCategories = { Puppy: 0, Young: 0, Adult: 0, Senior: 0 };
      dogsArray.forEach((dog) => {
        if (dog.age_category) {
          ageCategories[dog.age_category] =
            (ageCategories[dog.age_category] || 0) + 1;
        }
      });

      // Calculate average age range
      const avgAgeMonths =
        ageCount > 0 ? Math.round(totalAgeMonths / ageCount) : 36;
      const avgAgeYears = Math.floor(avgAgeMonths / 12);
      const avgAgeText =
        avgAgeYears === 0
          ? `${avgAgeMonths} months`
          : avgAgeYears === 1
            ? "1 year"
            : `${avgAgeYears} years`;

      // Get actual organization and country data from breed stats
      // Use the collected sets, but provide reasonable defaults if empty
      const organizationsCount =
        organizationSet.size > 0
          ? organizationSet.size
          : mixedGroup?.organizations?.length || 10; // Default estimate
      const countriesCount =
        countrySet.size > 0
          ? countrySet.size
          : mixedGroup?.countries?.length || 2; // Default to at least 2 countries

      return {
        primary_breed: "Mixed Breed",
        breed_slug: "mixed",
        breed_type: "mixed",
        breed_group: "Mixed",
        count: mixedGroup?.count || 0,
        organizations: Array.from(organizationSet).slice(0, 10), // Top 10 orgs
        countries: Array.from(countrySet),
        organization_count: organizationsCount,
        country_count: countriesCount,
        topDogs: topDogs.results || topDogs,
        description:
          "Every mixed breed is unique! These wonderful dogs combine traits from multiple breeds, creating diverse personalities, unique looks, and often fewer health issues. Each one has their own special story and character.",
        personality_profile: personalityProfile,
        personality_metrics: personalityMetrics, // Add this for PersonalityBarChart component
        personality_traits: commonTraits,
        experience_distribution: experienceDistribution,
        age_distribution: ageCategories,
        // Add proper stats for display
        average_age: avgAgeText,
        average_age_months: avgAgeMonths,
        available_count: mixedGroup?.count || 0,
      };
    }

    // Original code for specific breeds
    const breedStats = await getBreedStats();
    const breedData = breedStats.qualifying_breeds?.find(
      (breed) => breed.breed_slug === slug,
    );

    if (!breedData) {
      throw new Error(`Breed not found: ${slug}`);
    }

    const topDogs = await getAnimals({
      breed: breedData.primary_breed,
      limit: 6,
      sort_by: "created_at",
      sort_order: "desc",
    });

    const breedDescriptions = {
      galgo:
        "Spanish Greyhounds are gentle sighthounds known for their calm, affectionate nature. Despite their athletic build, they're surprisingly lazy, preferring short bursts of exercise followed by long naps.",
      lurcher:
        "Lurchers are gentle sighthound crosses that combine speed with intelligence. These 'part-time athletes' are calm indoors but love a good sprint, making wonderful family companions.",
      greyhound:
        "Greyhounds are gentle giants known as '45 mph couch potatoes.' Despite their racing background, they're calm indoor companions who need surprisingly little exercise.",
      collie:
        "Collies are intelligent, loyal herding dogs famous for their devotion to family. These sensitive souls are excellent with children and make wonderful family pets.",
      "cocker-spaniel":
        "Cocker Spaniels are cheerful, affectionate dogs with gentle temperaments. These medium-sized companions are known for their beautiful, silky coats and expressive eyes.",
      "cavalier-king-charles-spaniel":
        "Cavalier King Charles Spaniels are gentle, affectionate toy spaniels perfect for companionship. They're equally happy on adventures or cuddling on laps.",
      "staffordshire-bull-terrier":
        "Staffordshire Bull Terriers are muscular, affectionate dogs known for their love of people and legendary devotion to family, especially children.",
      bulldog:
        "Bulldogs are gentle, affectionate companions known for their distinctive wrinkled faces. Despite their tough appearance, they're sweet-natured and excellent with children.",
      "french-bulldog":
        "French Bulldogs are charming, affectionate companions perfect for apartment living. These adaptable dogs are known for their distinctive 'bat ears' and playful personalities.",
      "labrador-retriever":
        "Labrador Retrievers are friendly, outgoing, and active companions who famously love water and retrieving games. They're excellent family dogs with a gentle nature.",
      "german-shepherd":
        "German Shepherds are versatile, intelligent working dogs devoted to their family. They're confident, courageous, and excel at everything they're trained to do.",
      "german-shepherd-dog":
        "German Shepherds are versatile, intelligent working dogs devoted to their family. They're confident, courageous, and excel at everything they're trained to do.",
      "mixed-breed":
        "Mixed breed dogs combine the best traits of multiple breeds, often resulting in unique personalities and appearances. Each one is truly one-of-a-kind.",
      podenco:
        "Podencos are ancient Spanish hunting dogs with keen senses and athletic builds. They're intelligent, independent, and make loyal companions when given proper exercise.",
      husky:
        "Siberian Huskies are energetic, intelligent dogs bred for endurance in harsh climates. They're friendly, dignified, and known for their striking blue eyes.",
      "siberian-husky":
        "Siberian Huskies are energetic, intelligent dogs bred for endurance in harsh climates. They're friendly, dignified, and known for their striking blue eyes.",
      boxer:
        "Boxers are playful, energetic dogs with patience and protective instincts. They're excellent with children and make devoted family guardians.",
      beagle:
        "Beagles are friendly, curious hounds with excellent noses and happy-go-lucky personalities. They're great with kids and other dogs.",
      "golden-retriever":
        "Golden Retrievers are intelligent, friendly, and devoted companions. They're eager to please and excel as family dogs and service animals.",
      pointer:
        "Pointers are energetic, even-tempered dogs bred for hunting. They're loyal, hardworking, and make excellent companions for active families.",
      "jack-russell-terrier":
        "Jack Russell Terriers are small dogs with enormous personalities and endless energy. These fearless terriers are intelligent but independent, requiring experienced owners who can match their wit and provide extensive exercise.",
      "shih-tzu":
        "Shih Tzus are affectionate lap dogs with cheerful dispositions, originally bred for Chinese royalty. These adaptable companions are excellent for apartment living and love being the center of attention.",
      "bichon-frise":
        "Bichon Frises are cheerful, fluffy companions with hypoallergenic coats and merry personalities. These adaptable dogs are excellent with children and make delightful family pets who love to be pampered.",
      chihuahua:
        "Chihuahuas are tiny dogs with giant personalities and fierce loyalty to their families. Despite their small size, they're confident watchdogs who make devoted companions for patient owners.",
      terrier:
        "Terriers are spirited, energetic dogs originally bred for hunting vermin. These confident, feisty companions are intelligent and loyal but need consistent training and plenty of mental stimulation.",
      spaniel:
        "Spaniels are gentle, affectionate sporting dogs known for their beautiful coats and loving temperaments. These versatile companions are excellent family dogs who enjoy both active adventures and quiet cuddles.",
    };

    return {
      ...breedData,
      breed_slug: slug, // Ensure breed_slug is included
      topDogs: topDogs.results || topDogs,
      description:
        breedDescriptions[slug] ||
        `${breedData.primary_breed} dogs are wonderful companions looking for loving homes.`,
    };
  } catch (error) {
    console.error(`Error fetching breed data for ${slug}:`, error);
    throw error;
  }
});

export const getBreedDogs = cache(async (breedSlug, filters = {}) => {
  try {
    const breedStats = await getBreedStats();
    const breedData = breedStats.qualifying_breeds?.find(
      (breed) => breed.breed_slug === breedSlug,
    );

    if (!breedData) {
      throw new Error(`Breed not found: ${breedSlug}`);
    }

    const params = {
      breed: breedData.primary_breed,
      limit: filters.limit || 12,
      offset: filters.offset || 0,
      ...filters,
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
    const breedData = breedStats.qualifying_breeds?.find(
      (breed) => breed.breed_slug === breedSlug,
    );

    if (!breedData) {
      return null;
    }

    return getFilterCounts({
      breed: breedData.primary_breed,
    });
  } catch (error) {
    console.error(
      `Error fetching breed filter counts for ${breedSlug}:`,
      error,
    );
    return null;
  }
});

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
