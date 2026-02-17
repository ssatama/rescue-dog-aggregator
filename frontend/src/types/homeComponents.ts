import type { Dog } from "./dog";
import type { BreedWithImages } from "../schemas/animals";
import type { OrganizationCardData } from "./organizationComponents";

export interface StatisticsOrganization {
  id: number;
  name: string;
  slug?: string;
  dog_count?: number;
  total_dogs?: number;
  ships_to?: string[];
  service_regions?: string[];
  recent_dogs?: Array<{
    id: number;
    name: string;
    thumbnail_url?: string;
    primary_image_url?: string;
  }>;
  new_this_week?: number;
  social_media?: Record<string, string>;
  logo_url?: string | null;
  country?: string | null;
  city?: string | null;
}

export interface StatisticsData {
  total_dogs: number;
  total_organizations: number;
  countries?: Array<{ country: string; count: number }>;
  organizations?: StatisticsOrganization[];
}

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
  initialStatistics: StatisticsData | null;
  initialRecentDogs: Dog[] | null;
  initialBreedsWithImages?: BreedWithImages[] | null;
  initialOrganizations?: OrganizationCardData[];
  initialCountryStats?: CountryStat[];
  initialAgeStats?: AgeStat[];
}

export interface HeroSectionProps {
  initialStatistics?: StatisticsData | null;
  previewDogs?: Dog[];
  priority?: boolean;
}

export interface DogSectionProps {
  title: string;
  subtitle: string;
  curationType: string;
  viewAllHref: string;
  initialDogs?: Dog[] | null;
  priority?: boolean;
}

export interface TrustSectionProps {
  initialStatistics?: StatisticsData | null;
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
