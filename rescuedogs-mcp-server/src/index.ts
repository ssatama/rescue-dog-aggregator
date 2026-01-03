#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { apiClient } from "./services/api-client.js";
import { cacheService } from "./services/cache-service.js";
import {
  formatDogsListMarkdown,
  formatDogMarkdown,
  formatBreedStatsMarkdown,
  formatStatisticsMarkdown,
  formatFilterCountsMarkdown,
  formatOrganizationsListMarkdown,
} from "./services/formatters.js";
import { fetchDogImage, fetchDogImages } from "./services/image-service.js";
import {
  SearchDogsInputSchema,
  GetDogDetailsInputSchema,
  ListBreedsInputSchema,
  GetStatisticsInputSchema,
  GetFilterCountsInputSchema,
  ListOrganizationsInputSchema,
  MatchPreferencesInputSchema,
  GetAdoptionGuideInputSchema,
} from "./schemas/index.js";
import type { EnhancedDogData, ImagePreset, Organization } from "./types.js";

const server = new McpServer({
  name: "rescuedogs-mcp-server",
  version: "1.0.0",
});

// Age category mapping: MCP uses lowercase, backend expects capitalized
const AGE_CATEGORY_MAP: Record<string, string> = {
  puppy: "Puppy",
  young: "Young",
  adult: "Adult",
  senior: "Senior",
};

// Tool 1: Search Dogs
server.tool(
  "rescuedogs_search_dogs",
  "Search for rescue dogs available for adoption from European and UK organizations. Returns matching dogs with basic info. Use rescuedogs_get_dog_details for full profiles.",
  SearchDogsInputSchema.shape,
  async (input) => {
    const parsed = SearchDogsInputSchema.parse(input);

    // Map age_category to capitalized form for backend
    const mappedAgeCategory = parsed.age_category
      ? AGE_CATEGORY_MAP[parsed.age_category]
      : undefined;

    // Check if query matches an organization name
    let organizationId = parsed.organization_id;
    let searchQuery = parsed.query;

    if (searchQuery && !organizationId) {
      let orgs = cacheService.getOrganizations<Organization[]>();
      if (!orgs) {
        orgs = await apiClient.getOrganizations({ active_only: true });
        cacheService.setOrganizations(orgs);
      }

      const queryLower = searchQuery.toLowerCase();
      const matchedOrg = orgs.find(
        (o) =>
          o.name.toLowerCase().includes(queryLower) ||
          queryLower.includes(o.name.toLowerCase())
      );

      if (matchedOrg) {
        organizationId = matchedOrg.id;
        searchQuery = undefined;
      }
    }

    const dogs = await apiClient.searchDogs({
      search: searchQuery,
      breed: parsed.breed,
      breed_group: parsed.breed_group,
      standardized_size: parsed.size,
      age_category: mappedAgeCategory,
      sex: parsed.sex,
      energy_level: parsed.energy_level,
      home_type: parsed.home_type,
      experience_level: parsed.experience_level,
      available_to_country: parsed.adoptable_to_country,
      organization_id: organizationId,
      limit: parsed.limit,
      offset: parsed.offset,
    });

    // Fetch enhanced data for all dogs in parallel
    let enhancedMap: Map<number, EnhancedDogData> | undefined;
    if (dogs.length > 0) {
      try {
        const enhancedData = await apiClient.getBulkEnhancedData(
          dogs.map((d) => d.id)
        );
        enhancedMap = new Map(enhancedData.map((e) => [e.id, e]));
      } catch {
        // Continue without enhanced data
      }
    }

    if (parsed.response_format === "json") {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: dogs.length,
                dogs: dogs.map((d) => ({
                  ...d,
                  enhanced: enhancedMap?.get(d.id) || null,
                })),
                has_more: dogs.length === parsed.limit,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Build response content
    const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: "image/jpeg" }> = [];

    // Add text content
    content.push({
      type: "text" as const,
      text: formatDogsListMarkdown(dogs, enhancedMap, {
        offset: parsed.offset ?? 0,
        limit: parsed.limit ?? 10,
      }),
    });

    // Add images if requested
    if (parsed.include_images && dogs.length > 0) {
      const images = await fetchDogImages(
        dogs.slice(0, 5).map((d) => d.primary_image_url),
        parsed.image_preset as ImagePreset
      );

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img) {
          content.push({
            type: "text" as const,
            text: `\n**${dogs[i]?.name}:**`,
          });
          content.push(img);
        }
      }
    }

    return { content };
  }
);

// Tool 2: Get Dog Details
server.tool(
  "rescuedogs_get_dog_details",
  "Get full details for a specific rescue dog including AI-generated personality profile, requirements, and adoption info.",
  GetDogDetailsInputSchema.shape,
  async (input) => {
    const parsed = GetDogDetailsInputSchema.parse(input);

    const dog = await apiClient.getDogBySlug(parsed.slug);

    // Fetch enhanced data
    let enhanced: EnhancedDogData | null = null;
    try {
      enhanced = await apiClient.getEnhancedDogData(dog.id);
    } catch {
      // Continue without enhanced data
    }

    if (parsed.response_format === "json") {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ ...dog, enhanced }, null, 2),
          },
        ],
      };
    }

    // Build response content
    const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: "image/jpeg" }> = [];

    // Add image first if requested
    if (parsed.include_image) {
      const image = await fetchDogImage(
        dog.primary_image_url,
        parsed.image_preset as ImagePreset
      );
      if (image) {
        content.push(image);
      }
    }

    // Add text content
    content.push({
      type: "text" as const,
      text: formatDogMarkdown(dog, enhanced),
    });

    return { content };
  }
);

// Tool 3: List Breeds
server.tool(
  "rescuedogs_list_breeds",
  "Get available breeds with counts and statistics. Shows which breeds have dogs available for adoption.",
  ListBreedsInputSchema.shape,
  async (input) => {
    const parsed = ListBreedsInputSchema.parse(input);

    // Check cache first
    let stats = cacheService.getBreedStats<Awaited<ReturnType<typeof apiClient.getBreedStats>>>();

    if (!stats) {
      stats = await apiClient.getBreedStats();
      cacheService.setBreedStats(stats);
    }

    // Filter by breed group if specified
    if (parsed.breed_group) {
      stats = {
        ...stats,
        qualifying_breeds: stats.qualifying_breeds.filter(
          (b) => b.breed_group?.toLowerCase() === parsed.breed_group?.toLowerCase()
        ),
      };
    }

    // Filter by min count
    if (parsed.min_count && parsed.min_count > 1) {
      stats = {
        ...stats,
        qualifying_breeds: stats.qualifying_breeds.filter(
          (b) => b.count >= (parsed.min_count || 1)
        ),
      };
    }

    if (parsed.response_format === "json") {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: formatBreedStatsMarkdown(stats, parsed.limit),
        },
      ],
    };
  }
);

// Tool 4: Get Statistics
server.tool(
  "rescuedogs_get_statistics",
  "Get overall statistics about available rescue dogs on the platform.",
  GetStatisticsInputSchema.shape,
  async (input) => {
    const parsed = GetStatisticsInputSchema.parse(input);

    // Check cache first
    let stats = cacheService.getStatistics<Awaited<ReturnType<typeof apiClient.getStatistics>>>();

    if (!stats) {
      stats = await apiClient.getStatistics();
      cacheService.setStatistics(stats);
    }

    if (parsed.response_format === "json") {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: formatStatisticsMarkdown(stats),
        },
      ],
    };
  }
);

// Tool 5: Get Filter Counts
server.tool(
  "rescuedogs_get_filter_counts",
  "Get available filter options with counts based on current filter context. Use this to show users valid filter choices that won't result in empty searches.",
  GetFilterCountsInputSchema.shape,
  async (input) => {
    const parsed = GetFilterCountsInputSchema.parse(input);

    // Build cache key from filters
    const filterHash = JSON.stringify(parsed.current_filters || {});
    let counts = cacheService.getFilterCounts<Awaited<ReturnType<typeof apiClient.getFilterCounts>>>(filterHash);

    if (!counts) {
      counts = await apiClient.getFilterCounts({
        breed: parsed.current_filters?.breed,
        standardized_size: parsed.current_filters?.size,
        age_category: parsed.current_filters?.age_category,
        sex: parsed.current_filters?.sex,
        available_to_country: parsed.current_filters?.adoptable_to_country,
      });
      cacheService.setFilterCounts(filterHash, counts);
    }

    if (parsed.response_format === "json") {
      // Sort available_country_options by count descending (most relevant first)
      const sortedCounts = {
        ...counts,
        available_country_options: [...counts.available_country_options].sort(
          (a, b) => b.count - a.count
        ),
      };
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(sortedCounts, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: formatFilterCountsMarkdown(counts),
        },
      ],
    };
  }
);

// Tool 6: List Organizations
server.tool(
  "rescuedogs_list_organizations",
  "List rescue organizations with their statistics and available dogs count.",
  ListOrganizationsInputSchema.shape,
  async (input) => {
    const parsed = ListOrganizationsInputSchema.parse(input);

    // Check cache first (only for unfiltered requests)
    let orgs: Awaited<ReturnType<typeof apiClient.getOrganizations>> | undefined;

    if (!parsed.country) {
      orgs = cacheService.getOrganizations<typeof orgs>();
    }

    if (!orgs) {
      orgs = await apiClient.getOrganizations({
        country: parsed.country,
        active_only: parsed.active_only,
        limit: parsed.limit,
      });

      if (!parsed.country) {
        cacheService.setOrganizations(orgs);
      }
    }

    if (parsed.response_format === "json") {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(orgs, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: formatOrganizationsListMarkdown(orgs),
        },
      ],
    };
  }
);

// Tool 7: Match Preferences
server.tool(
  "rescuedogs_match_preferences",
  "Find dogs that match your lifestyle preferences. Translates your living situation, activity level, and experience into appropriate filters.",
  MatchPreferencesInputSchema.shape,
  async (input) => {
    const parsed = MatchPreferencesInputSchema.parse(input);

    // Map living situation to home_type
    const homeTypeMap: Record<string, string> = {
      apartment: "apartment_ok",
      house_small_garden: "house_preferred",
      house_large_garden: "house_preferred",
      rural: "house_required",
    };

    // Map activity level to energy_level
    const energyLevelMap: Record<string, string> = {
      sedentary: "low",
      moderate: "medium",
      active: "high",
      very_active: "very_high",
    };

    // Map experience to experience_level
    const experienceMap: Record<string, string> = {
      first_time: "first_time_ok",
      some: "some_experience",
      experienced: "experienced_only",
    };

    const dogs = await apiClient.searchDogs({
      home_type: homeTypeMap[parsed.living_situation],
      energy_level: energyLevelMap[parsed.activity_level],
      experience_level: experienceMap[parsed.experience],
      available_to_country: parsed.adoptable_to_country,
      limit: parsed.limit,
    });

    // Fetch enhanced data
    let enhancedMap: Map<number, EnhancedDogData> | undefined;
    if (dogs.length > 0) {
      try {
        const enhancedData = await apiClient.getBulkEnhancedData(
          dogs.map((d) => d.id)
        );
        enhancedMap = new Map(enhancedData.map((e) => [e.id, e]));
      } catch {
        // Continue without enhanced data
      }
    }

    if (parsed.response_format === "json") {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: dogs.length,
                matched_criteria: {
                  home_type: homeTypeMap[parsed.living_situation],
                  energy_level: energyLevelMap[parsed.activity_level],
                  experience_level: experienceMap[parsed.experience],
                },
                dogs: dogs.map((d) => ({
                  ...d,
                  enhanced: enhancedMap?.get(d.id) || null,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: "image/jpeg" }> = [];

    // Add header with matched criteria
    const header = `# Dogs Matching Your Preferences

**Your Profile:**
- Living Situation: ${parsed.living_situation.replace(/_/g, " ")}
- Activity Level: ${parsed.activity_level}
- Experience: ${parsed.experience.replace(/_/g, " ")}
${parsed.adoptable_to_country ? `- Adopting to: ${parsed.adoptable_to_country}` : ""}

`;

    content.push({
      type: "text" as const,
      text: header + formatDogsListMarkdown(dogs, enhancedMap, {
        offset: 0,
        limit: parsed.limit ?? 5,
      }),
    });

    // Add images if requested
    if (parsed.include_images && dogs.length > 0) {
      const images = await fetchDogImages(
        dogs.slice(0, 5).map((d) => d.primary_image_url),
        "thumbnail"
      );

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img) {
          content.push({
            type: "text" as const,
            text: `\n**${dogs[i]?.name}:**`,
          });
          content.push(img);
        }
      }
    }

    return { content };
  }
);

// Tool 8: Get Adoption Guide
server.tool(
  "rescuedogs_get_adoption_guide",
  "Get information about the rescue dog adoption process including transport, fees, requirements, and timeline.",
  GetAdoptionGuideInputSchema.shape,
  async (input) => {
    const parsed = GetAdoptionGuideInputSchema.parse(input);

    const guides: Record<string, string> = {
      overview: `# How Rescue Dog Adoption Works

Adopting a rescue dog from Europe is a rewarding experience. Here's what you need to know:

## The Process

1. **Browse Available Dogs**
   Use rescuedogs.me to search dogs from vetted rescue organizations across Europe and the UK.

2. **Submit an Application**
   When you find a dog you like, click their adoption link to apply directly with the rescue organization.

3. **Home Check**
   Most rescues require a home check (in-person or virtual) to ensure your home is suitable.

4. **Meet & Greet**
   Some rescues arrange meet-and-greets. For international adoptions, this may be via video call.

5. **Transport Arranged**
   Once approved, the rescue coordinates transport via approved pet transport services.

6. **Welcome Home!**
   Your new family member arrives with all veterinary documentation.

*Use rescuedogs_get_adoption_guide(topic: "transport") for transport details.*
*Use rescuedogs_get_adoption_guide(topic: "fees") for fee information.*`,

      transport: `# Dog Transport Options

## For UK/EU Adoptions

### Pet Transport Services
- Professional pet couriers transport dogs safely across Europe
- Climate-controlled vehicles with regular rest stops
- Typical journey: 2-5 days depending on origin

### PETS Scheme (UK)
Since Brexit, dogs entering the UK must:
- Have a microchip (ISO 11784/11785)
- Valid rabies vaccination (21+ days before travel)
- Tapeworm treatment (24-120 hours before arrival)
- Animal Health Certificate (AHC) from an Official Veterinarian

### EU Pet Passport
Dogs traveling within the EU use the EU Pet Passport system:
- Microchip identification
- Rabies vaccination record
- Any additional treatments required by destination

### Typical Timeline
- Application approval: 1-2 weeks
- Veterinary preparation: 2-4 weeks
- Transport booking: 1-2 weeks
- Total: 4-8 weeks typical

*Most rescues handle all paperwork and transport logistics for you.*`,

      fees: `# Adoption Fees Explained

## What's Typically Included

### Standard Adoption Fee: £200-500 (varies by organization)

This usually covers:
- **Vaccinations:** Core vaccines (DHPP, rabies)
- **Microchip:** Permanent identification
- **Spay/Neuter:** If old enough
- **Deworming:** Internal parasite treatment
- **Flea/Tick:** External parasite treatment
- **Health Check:** Veterinary examination
- **EU Pet Passport/AHC:** Required documentation

### Transport Fee: £100-300 (varies by distance)

- Professional pet transport services
- Vehicle-based transport (not air)
- Often included or partially subsidized

### What You'll Pay

| Item | Typical Cost |
|------|-------------|
| Adoption Fee | £200-400 |
| Transport | £100-300 |
| **Total** | **£300-700** |

*Fees support the rescue's ongoing work saving more dogs.*`,

      requirements: `# Adoption Requirements

## Standard Requirements

### Home Assessment
- Safe, secure garden (fencing requirements vary)
- Dog-friendly environment
- No rental restrictions on pets
- Suitable space for dog's size

### Household Agreement
- All household members agree to adoption
- Existing pets are compatible (sometimes intro required)
- Plan for dog during work hours

### Experience Considerations
Some dogs may require:
- Previous dog ownership experience
- Homes without small children
- No cats or other small animals
- Experienced handlers only

### Practical Requirements
- Valid ID and proof of address
- Ability to pay adoption fee upfront
- Agree to post-adoption check-ins
- Home visit (virtual or in-person)

*Each rescue has specific requirements. Read individual dog profiles carefully.*`,

      timeline: `# Typical Adoption Timeline

## Week by Week

### Week 1-2: Application
- Browse available dogs on rescuedogs.me
- Submit application to rescue
- Initial screening call/questionnaire

### Week 2-3: Home Check
- Virtual or in-person home assessment
- Answer questions about your home and lifestyle
- Discuss specific dog's needs

### Week 3-4: Approval & Matching
- Application approved
- Dog officially reserved for you
- Adoption contract signed

### Week 4-6: Veterinary Prep
- Dog receives final health checks
- Vaccinations completed
- Documentation prepared
- Rabies observation period (if required)

### Week 6-8: Transport
- Transport date confirmed
- Final paperwork completed
- Dog travels to you

### Week 8+: Welcome Home!
- Dog arrives at your home
- Settling-in period begins
- Post-adoption support from rescue

## Total Timeline: 6-10 weeks typical

*Some dogs available for faster adoption if already in foster in your country.*`,
    };

    const topic = parsed.topic || "overview";
    const guide = guides[topic] || guides.overview;

    // Add country-specific info if provided
    let countryInfo = "";
    if (parsed.country) {
      const countryGuides: Record<string, string> = {
        GB: `\n\n## UK-Specific Information\n\n- Dogs must enter through approved UK ports/airports\n- Animal Health Certificate required (replaced EU Pet Passport post-Brexit)\n- 21-day wait after rabies vaccination before travel\n- Tapeworm treatment required 1-5 days before arrival`,
        IE: `\n\n## Ireland-Specific Information\n\n- EU Pet Passport accepted from EU countries\n- Standard EU pet travel rules apply\n- Rabies vaccination and microchip required`,
        DE: `\n\n## Germany-Specific Information\n\n- EU Pet Passport system applies\n- Some states have breed-specific legislation\n- Dog tax (Hundesteuer) required in most municipalities`,
        FR: `\n\n## France-Specific Information\n\n- EU Pet Passport system applies\n- Category 1 & 2 dogs have additional requirements\n- Standard EU pet travel rules`,
      };
      countryInfo = countryGuides[parsed.country.toUpperCase()] || "";
    }

    return {
      content: [
        {
          type: "text" as const,
          text: guide + countryInfo,
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("rescuedogs-mcp-server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
