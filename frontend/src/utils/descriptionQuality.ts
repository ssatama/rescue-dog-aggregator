import type { Dog } from "@/types/dog";

const stripHtmlTags = (text: string): string => {
  if (!text || typeof text !== "string") return "";
  return text.replace(/<[^>]+>/g, "");
};

const isFallbackContent = (text: string): boolean => {
  if (!text || typeof text !== "string") return true;

  const textLower = text.toLowerCase();

  const fallbackPatterns = [
    "looking for a loving forever home",
    "contact the rescue organization to learn more",
    "contact [organization] to learn more",
    "wonderful dog's personality, needs, and how you can provide",
    "ready to fly",
  ];

  const patternCount = fallbackPatterns.reduce((count, pattern) => {
    return count + (textLower.includes(pattern) ? 1 : 0);
  }, 0);

  return patternCount >= 2;
};

export const hasQualityDescription = (description: string | null | undefined): boolean => {
  if (!description || typeof description !== "string") {
    return false;
  }

  const plainText = stripHtmlTags(description.trim());

  if (plainText.length < 200) {
    return false;
  }

  if (isFallbackContent(plainText)) {
    return false;
  }

  return true;
};

export const getQualityDescription = (dog: Partial<Dog> | null | undefined): string | null => {
  if (!dog) return null;

  const propsDescription = dog.properties?.description;
  if (propsDescription && hasQualityDescription(propsDescription)) {
    return stripHtmlTags(propsDescription.trim());
  }

  const rootDescription = dog.description;
  if (rootDescription && hasQualityDescription(rootDescription)) {
    return stripHtmlTags(rootDescription.trim());
  }

  return null;
};

export const generateSEODescription = (dog: Partial<Dog> | null | undefined): string | null => {
  if (!dog) return null;

  let baseDescription: string | null = null;

  if (dog.llm_description) {
    baseDescription = dog.llm_description;
  } else {
    const qualityDescription = getQualityDescription(dog);
    if (!qualityDescription) {
      return null;
    }
    baseDescription = qualityDescription;
  }

  let seoDescription = baseDescription;

  if (dog.organization) {
    const orgInfo: string[] = [];
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

export const generateFallbackDescription = (dog: Partial<Dog> | null | undefined): string => {
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
