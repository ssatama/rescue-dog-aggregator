import type { Dog } from "./dog";
import type { BreedWithImages, Statistics } from "../schemas/animals";
import type { OrganizationCardData } from "./organizationComponents";
import type { CurationType } from "../services/animalsService";

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
  initialStatistics?: Statistics | null;
  previewDogs?: Dog[];
  priority?: boolean;
}

export interface DogSectionProps {
  title: string;
  subtitle: string;
  curationType: CurationType;
  viewAllHref: string;
  initialDogs?: Dog[] | null;
  priority?: boolean;
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
