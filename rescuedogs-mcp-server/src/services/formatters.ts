import { CHARACTER_LIMIT } from "../constants.js";
import type {
  Dog,
  EnhancedDogData,
  Organization,
  BreedStats,
  QualifyingBreed,
  Statistics,
  FilterCountsResponse,
} from "../types.js";

export function truncateIfNeeded(text: string): string {
  if (text.length <= CHARACTER_LIMIT) {
    return text;
  }
  const truncated = text.slice(0, CHARACTER_LIMIT - 100);
  return `${truncated}\n\n... (truncated due to length limit)`;
}

export function formatDogMarkdown(
  dog: Dog,
  enhanced?: EnhancedDogData | null
): string {
  const parts: string[] = [];

  // Header with name
  parts.push(`# ${dog.name}`);
  parts.push("");

  // Tagline if available
  if (enhanced?.tagline) {
    parts.push(`*${enhanced.tagline}*`);
    parts.push("");
  }

  // Basic info
  parts.push("## Basic Information");
  parts.push("");
  if (dog.breed || dog.standardized_breed) {
    parts.push(`- **Breed:** ${dog.standardized_breed || dog.breed}`);
  }
  if (dog.age_text) {
    parts.push(`- **Age:** ${dog.age_text}`);
  }
  if (dog.sex) {
    parts.push(`- **Sex:** ${dog.sex}`);
  }
  if (dog.standardized_size || dog.size) {
    parts.push(`- **Size:** ${dog.standardized_size || dog.size}`);
  }
  if (dog.breed_group) {
    parts.push(`- **Breed Group:** ${dog.breed_group}`);
  }
  parts.push("");

  // Enhanced description/bio
  if (enhanced?.bio || enhanced?.enhanced_description) {
    parts.push("## About");
    parts.push("");
    parts.push(enhanced.bio || enhanced.enhanced_description || "");
    parts.push("");
  }

  // Personality traits
  if (enhanced?.personality_traits && enhanced.personality_traits.length > 0) {
    parts.push("## Personality");
    parts.push("");
    parts.push(enhanced.personality_traits.map((t) => `- ${t}`).join("\n"));
    parts.push("");
  }

  // Interests
  if (enhanced?.interests && enhanced.interests.length > 0) {
    parts.push("## Interests");
    parts.push("");
    parts.push(enhanced.interests.map((i) => `- ${i}`).join("\n"));
    parts.push("");
  }

  // Looking for (ideal home)
  if (enhanced?.looking_for) {
    parts.push("## Looking For");
    parts.push("");
    parts.push(enhanced.looking_for);
    parts.push("");
  }

  // Requirements
  if (enhanced?.energy_level || enhanced?.home_type || enhanced?.experience_level) {
    parts.push("## Requirements");
    parts.push("");
    if (enhanced.energy_level) {
      parts.push(`- **Energy Level:** ${formatEnumValue(enhanced.energy_level)}`);
    }
    if (enhanced.home_type) {
      parts.push(`- **Home Type:** ${formatEnumValue(enhanced.home_type)}`);
    }
    if (enhanced.experience_level) {
      parts.push(`- **Experience Needed:** ${formatEnumValue(enhanced.experience_level)}`);
    }
    parts.push("");
  }

  // Deal breakers
  if (enhanced?.deal_breakers && enhanced.deal_breakers.length > 0) {
    parts.push("## Important Notes");
    parts.push("");
    parts.push(enhanced.deal_breakers.map((d) => `- ${d}`).join("\n"));
    parts.push("");
  }

  // Fun fact
  if (enhanced?.fun_fact) {
    parts.push("## Fun Fact");
    parts.push("");
    parts.push(enhanced.fun_fact);
    parts.push("");
  }

  // Organization info
  if (dog.organization) {
    parts.push("## Rescue Organization");
    parts.push("");
    parts.push(`- **Name:** ${dog.organization.name}`);
    if (dog.organization.city && dog.organization.country) {
      parts.push(`- **Location:** ${dog.organization.city}, ${dog.organization.country}`);
    }
    if (dog.organization.website_url) {
      parts.push(`- **Website:** ${dog.organization.website_url}`);
    }
    parts.push("");
  }

  // Adoption link (CRITICAL: traffic driver)
  parts.push("## Adoption");
  parts.push("");
  parts.push(`**Apply to adopt ${dog.name}:** ${dog.adoption_url}`);
  parts.push("");
  parts.push(`*View full profile on rescuedogs.me: https://www.rescuedogs.me/dogs/${dog.slug}*`);

  return truncateIfNeeded(parts.join("\n"));
}

export function formatDogsListMarkdown(
  dogs: Dog[],
  enhancedData?: Map<number, EnhancedDogData>
): string {
  if (dogs.length === 0) {
    return "No dogs found matching your criteria. Try broadening your search filters.";
  }

  const parts: string[] = [];
  parts.push(`# Search Results (${dogs.length} dogs)`);
  parts.push("");

  for (const dog of dogs) {
    const enhanced = enhancedData?.get(dog.id);

    parts.push(`## ${dog.name}`);
    if (enhanced?.tagline) {
      parts.push(`*${enhanced.tagline}*`);
    }
    parts.push("");

    const details: string[] = [];
    if (dog.standardized_breed || dog.breed) {
      details.push(`**Breed:** ${dog.standardized_breed || dog.breed}`);
    }
    if (dog.age_text) details.push(`**Age:** ${dog.age_text}`);
    if (dog.sex) details.push(`**Sex:** ${dog.sex}`);
    if (dog.standardized_size) details.push(`**Size:** ${dog.standardized_size}`);

    parts.push(details.join(" | "));
    parts.push("");

    if (dog.organization) {
      parts.push(`**From:** ${dog.organization.name} (${dog.organization.country})`);
    }

    parts.push(`**Details:** \`rescuedogs_get_dog_details(slug: "${dog.slug}")\``);
    parts.push(`**Adopt:** ${dog.adoption_url}`);
    parts.push("");
    parts.push("---");
    parts.push("");
  }

  parts.push("*Use rescuedogs_get_dog_details to see the full profile for any dog.*");

  return truncateIfNeeded(parts.join("\n"));
}

export function formatBreedStatsMarkdown(
  stats: BreedStats,
  limit?: number
): string {
  const parts: string[] = [];

  parts.push("# Available Breeds");
  parts.push("");
  parts.push(`**Total Dogs:** ${stats.total_dogs.toLocaleString()}`);
  parts.push(`**Unique Breeds:** ${stats.unique_breeds.toLocaleString()}`);
  parts.push(`**Purebred:** ${stats.purebred_count.toLocaleString()}`);
  parts.push(`**Crossbreed/Mixed:** ${stats.crossbreed_count.toLocaleString()}`);
  parts.push("");

  if (stats.breed_groups.length > 0) {
    parts.push("## Breed Groups");
    parts.push("");
    for (const group of stats.breed_groups) {
      parts.push(`- **${group.name}:** ${group.count} dogs`);
    }
    parts.push("");
  }

  const breeds = limit
    ? stats.qualifying_breeds.slice(0, limit)
    : stats.qualifying_breeds;

  if (breeds.length > 0) {
    parts.push("## Top Breeds");
    parts.push("");
    for (const breed of breeds) {
      parts.push(`### ${breed.primary_breed} (${breed.count} dogs)`);
      parts.push("");
      formatBreedDetails(breed, parts);
      parts.push("");
    }
  }

  return truncateIfNeeded(parts.join("\n"));
}

function formatBreedDetails(breed: QualifyingBreed, parts: string[]): void {
  if (breed.breed_group) {
    parts.push(`- **Group:** ${breed.breed_group}`);
  }
  if (breed.breed_type) {
    parts.push(`- **Type:** ${breed.breed_type}`);
  }
  if (breed.personality_traits.length > 0) {
    parts.push(`- **Traits:** ${breed.personality_traits.slice(0, 3).join(", ")}`);
  }
  if (breed.organization_count > 0) {
    parts.push(`- **Available from:** ${breed.organization_count} organizations`);
  }
}

export function formatOrganizationMarkdown(org: Organization): string {
  const parts: string[] = [];

  parts.push(`## ${org.name}`);
  parts.push("");
  if (org.description) {
    parts.push(org.description);
    parts.push("");
  }

  parts.push("### Details");
  parts.push("");
  parts.push(`- **Location:** ${org.city}, ${org.country}`);
  parts.push(`- **Dogs Available:** ${org.total_dogs}`);
  if (org.new_this_week > 0) {
    parts.push(`- **New This Week:** ${org.new_this_week}`);
  }
  if (org.ships_to.length > 0) {
    parts.push(`- **Ships To:** ${org.ships_to.join(", ")}`);
  }
  if (org.website_url) {
    parts.push(`- **Website:** ${org.website_url}`);
  }
  parts.push("");

  return parts.join("\n");
}

export function formatOrganizationsListMarkdown(orgs: Organization[]): string {
  if (orgs.length === 0) {
    return "No organizations found matching your criteria.";
  }

  const parts: string[] = [];
  parts.push(`# Rescue Organizations (${orgs.length})`);
  parts.push("");

  for (const org of orgs) {
    parts.push(formatOrganizationMarkdown(org));
    parts.push("---");
    parts.push("");
  }

  return truncateIfNeeded(parts.join("\n"));
}

export function formatStatisticsMarkdown(stats: Statistics): string {
  const parts: string[] = [];

  parts.push("# Rescue Dogs Statistics");
  parts.push("");
  parts.push("## Overview");
  parts.push("");
  parts.push(`- **Available Dogs:** ${stats.available_dogs.toLocaleString()}`);
  parts.push(`- **Total Dogs in Database:** ${stats.total_dogs.toLocaleString()}`);
  parts.push(`- **Dogs Adopted:** ${stats.adopted_dogs.toLocaleString()}`);
  parts.push(`- **New This Week:** ${stats.new_this_week.toLocaleString()}`);
  parts.push("");
  parts.push("## Platform");
  parts.push("");
  parts.push(`- **Rescue Organizations:** ${stats.organizations_count}`);
  parts.push(`- **Unique Breeds:** ${stats.breeds_count}`);
  parts.push(`- **Countries Covered:** ${stats.countries_with_dogs}`);
  parts.push("");
  parts.push("*Data from rescuedogs.me - European & UK rescue dog aggregator*");

  return parts.join("\n");
}

export function formatFilterCountsMarkdown(counts: FilterCountsResponse): string {
  const parts: string[] = [];

  parts.push("# Available Filter Options");
  parts.push("");

  if (counts.size_options.length > 0) {
    parts.push("## Size");
    for (const opt of counts.size_options) {
      parts.push(`- ${opt.label}: ${opt.count} dogs`);
    }
    parts.push("");
  }

  if (counts.age_options.length > 0) {
    parts.push("## Age");
    for (const opt of counts.age_options) {
      parts.push(`- ${opt.label}: ${opt.count} dogs`);
    }
    parts.push("");
  }

  if (counts.sex_options.length > 0) {
    parts.push("## Sex");
    for (const opt of counts.sex_options) {
      parts.push(`- ${opt.label}: ${opt.count} dogs`);
    }
    parts.push("");
  }

  if (counts.available_country_options.length > 0) {
    parts.push("## Available To (Countries)");
    for (const opt of counts.available_country_options.slice(0, 10)) {
      parts.push(`- ${opt.label}: ${opt.count} dogs`);
    }
    parts.push("");
  }

  if (counts.breed_options.length > 0) {
    parts.push("## Top Breeds");
    for (const opt of counts.breed_options.slice(0, 10)) {
      parts.push(`- ${opt.label}: ${opt.count} dogs`);
    }
    parts.push("");
  }

  return truncateIfNeeded(parts.join("\n"));
}

function formatEnumValue(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
