import type { Dog } from "./dog";
import type { BreedWithImages, Statistics } from "../schemas/animals";
import type { OrganizationCardData } from "./organizationComponents";

export interface CountryStat {
  code: string;
  count: number;
  name?: string;
}

export interface AgeStat {
  slug: string;
  count: number;
  label?: string;
}

export interface ClientHomePageProps {
  initialStatistics: Statistics | null;
  initialRecentDogs: Dog[] | null;
  initialBreedsWithImages?: BreedWithImages[] | null;
  initialOrganizations?: OrganizationCardData[];
  initialCountryStats?: CountryStat[];
  initialAgeStats?: AgeStat[];
}

export interface HeroSectionProps {
  statistics: Statistics;
  previewDogs?: Dog[];
}

export interface TrustSectionProps {
  initialStatistics?: Statistics | null;
}

export interface AgeBrowseSectionProps {
  ageStats?: AgeStat[];
}

export interface CountryBrowseSectionProps {
  countryStats?: CountryStat[];
}

export interface HeroDogPreviewCardProps {
  dog: Dog;
  index?: number;
  priority?: boolean;
}

export interface FeaturedDogsSectionProps {
  dogs: Dog[];
  totalCount: number;
}
