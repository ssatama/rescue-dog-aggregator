/**
 * Description quality assessment utilities
 * Mirrors backend quality filtering logic for consistent SEO content validation
 */

/**
 * Strip HTML tags from text for quality assessment
 * @param {string} text - Text that may contain HTML
 * @returns {string} Plain text with HTML tags removed
 */
const stripHtmlTags = (text) => {
  if (!text || typeof text !== "string") return "";
  return text.replace(/<[^>]+>/g, "");
};

/**
 * Check if text contains common fallback content patterns
 * @param {string} text - Plain text description to check
 * @returns {boolean} True if text appears to be generic fallback content
 */
const isFallbackContent = (text) => {
  if (!text || typeof text !== "string") return true;

  const textLower = text.toLowerCase();

  // Common fallback patterns to exclude (mirrors backend logic exactly)
  const fallbackPatterns = [
    "looking for a loving forever home",
    "contact the rescue organization to learn more",
    "contact [organization] to learn more",
    "wonderful dog's personality, needs, and how you can provide",
    "ready to fly",
  ];

  // Check if text contains multiple fallback patterns (likely generated)
  const patternCount = fallbackPatterns.reduce((count, pattern) => {
    return count + (textLower.includes(pattern) ? 1 : 0);
  }, 0);

  // If 2+ patterns match, likely fallback content
  return patternCount >= 2;
};

/**
 * Assess if a description meets quality standards for SEO
 * Uses same criteria as backend: >200 chars, no HTML, no fallback patterns
 * @param {string} description - Raw description text
 * @returns {boolean} True if description meets quality standards
 */
export const hasQualityDescription = (description) => {
  // Skip if no description
  if (!description || typeof description !== "string") {
    return false;
  }

  // Calculate plain text length (strip HTML if present)
  const plainText = stripHtmlTags(description.trim());

  // Skip if too short (mirrors backend 200 char minimum)
  if (plainText.length < 200) {
    return false;
  }

  // Skip if contains fallback patterns
  if (isFallbackContent(plainText)) {
    return false;
  }

  return true;
};

/**
 * Get the best available description from a dog object
 * Prioritizes genuine database descriptions that pass quality checks
 * @param {Object} dog - Dog data object
 * @returns {string|null} Quality description or null if none available
 */
export const getQualityDescription = (dog) => {
  if (!dog) return null;

  // Check properties.description first (where scraped content lives)
  const propsDescription = dog.properties?.description;
  if (propsDescription && hasQualityDescription(propsDescription)) {
    return stripHtmlTags(propsDescription.trim());
  }

  // Check root description as fallback
  const rootDescription = dog.description;
  if (rootDescription && hasQualityDescription(rootDescription)) {
    return stripHtmlTags(rootDescription.trim());
  }

  // No quality description found
  return null;
};

/**
 * Generate SEO-optimized description with organization info
 * Uses only quality descriptions - NO generic boilerplate
 * @param {Object} dog - Dog data object
 * @returns {string|null} SEO description or null if no quality content
 */
export const generateSEODescription = (dog) => {
  if (!dog) return null;

  const qualityDescription = getQualityDescription(dog);
  if (!qualityDescription) {
    return null; // NO boilerplate fallback for SEO
  }

  let seoDescription = qualityDescription;

  // Add organization context if available (valuable for local SEO)
  if (dog.organization) {
    const orgInfo = [];
    if (dog.organization.name) {
      orgInfo.push(`Available from ${dog.organization.name}`);
    }
    if (dog.organization.city && dog.organization.country) {
      orgInfo.push(`in ${dog.organization.city}, ${dog.organization.country}`);
    } else if (dog.organization.country) {
      orgInfo.push(`in ${dog.organization.country}`);
    }

    if (orgInfo.length > 0) {
      seoDescription += ` ${orgInfo.join(" ")}.`;
    }
  }

  return seoDescription;
};

/**
 * Generate fallback description for dogs without quality descriptions
 * Only used for user-facing content, NOT for SEO meta tags
 * @param {Object} dog - Dog data object
 * @returns {string} User-friendly fallback description
 */
export const generateFallbackDescription = (dog) => {
  if (!dog || !dog.name) {
    return "Dog available for adoption";
  }

  const breed = dog.standardized_breed || dog.breed || "dog";
  let description = `${dog.name} is a ${breed} available for adoption`;

  if (dog.organization) {
    description += ` from ${dog.organization.name}`;
    if (dog.organization.city || dog.organization.country) {
      const location = [dog.organization.city, dog.organization.country]
        .filter(Boolean)
        .join(", ");
      description += ` in ${location}`;
    }
  }

  description += ".";
  return description;
};
