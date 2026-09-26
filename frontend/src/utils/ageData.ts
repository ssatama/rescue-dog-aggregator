export interface AgeCategoryConfig {
  slug: string;
  name: string;
  /** The page's heading */
  title: string;
  shortName: string;
  apiValue: string;
  tagline: string;
  description: string;
  ageRange: string;
  ageMonths: { min: number; max?: number };
  seoKeywords: string;
}

export const AGE_CATEGORIES: Record<string, AgeCategoryConfig> = {
  puppies: {
    slug: "puppies",
    name: "Puppies",
    title: "Rescue puppies",
    shortName: "Puppies",
    apiValue: "Puppy",
    tagline: "Little bundles of joy, 0-12 months of pure love",
    description:
      "Young rescue puppies full of energy and playfulness, ready to grow with you",
    ageRange: "Under 1 year",
    ageMonths: { min: 0, max: 11 },
    seoKeywords:
      "rescue puppies, puppies for adoption, adopt puppy, young dogs for adoption",
  },
  senior: {
    slug: "senior",
    name: "Senior Dogs",
    title: "Senior rescue dogs",
    shortName: "Seniors",
    apiValue: "Senior",
    tagline: "Wise companions with so much love to give",
    description:
      "Gentle, mature dogs seeking their forever home for their golden years",
    ageRange: "8+ years",
    ageMonths: { min: 96 },
    seoKeywords:
      "senior rescue dogs, older dogs for adoption, adopt senior dog, elderly dogs, retired dogs",
  },
};

export const getAgeCategoryBySlug = (slug: string | null | undefined): AgeCategoryConfig | null =>
  AGE_CATEGORIES[slug?.toLowerCase() ?? ""] || null;

export const getAllAgeSlugs = (): string[] => Object.keys(AGE_CATEGORIES);

export const getAgeCategoriesArray = (): AgeCategoryConfig[] => Object.values(AGE_CATEGORIES);

export const getOtherAgeCategory = (currentSlug: string | null | undefined): AgeCategoryConfig | null => {
  const normalizedSlug = currentSlug?.toLowerCase();
  if (!normalizedSlug || !AGE_CATEGORIES[normalizedSlug]) {
    return null;
  }
  const slugs = getAllAgeSlugs();
  const otherSlug = slugs.find((s) => s !== normalizedSlug);
  return otherSlug ? AGE_CATEGORIES[otherSlug] : null;
};
