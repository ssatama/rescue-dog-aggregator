export interface AgeCategoryConfig {
  slug: string;
  name: string;
  shortName: string;
  apiValue: string;
  icon: string;
  gradient: string;
  darkGradient: string;
  accentColor: string;
  emoji: string;
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
    shortName: "Puppies",
    apiValue: "Puppy",
    icon: "sparkles",
    gradient: "from-pink-400 via-rose-500 to-orange-400",
    darkGradient: "dark:from-pink-600 dark:via-rose-700 dark:to-orange-600",
    accentColor: "#f43f5e",
    emoji: "\u{1F436}",
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
    shortName: "Seniors",
    apiValue: "Senior",
    icon: "heart",
    gradient: "from-amber-500 via-orange-600 to-rose-600",
    darkGradient: "dark:from-amber-700 dark:via-orange-800 dark:to-rose-800",
    accentColor: "#f59e0b",
    emoji: "\u{1F9B4}",
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
