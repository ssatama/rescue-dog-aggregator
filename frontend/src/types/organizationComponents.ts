export type OrganizationCardSize = "small" | "medium" | "large";

export interface RecentDog {
  id: number | string;
  name: string;
  thumbnail_url?: string;
  primary_image_url?: string;
}

export interface OrganizationCardData {
  id: number | string;
  name: string;
  slug?: string;
  website_url?: string;
  logo_url?: string | null;
  country?: string;
  city?: string;
  social_media?: Record<string, string>;
  service_regions?: string[];
  ships_to?: string[];
  total_dogs?: number;
  new_this_week?: number;
  recent_dogs?: RecentDog[];
  description?: string;
  foster_based?: boolean;
  active_since?: string;
}

export interface OrganizationCardProps {
  organization: OrganizationCardData;
  size?: OrganizationCardSize;
  /** On a dog page, "View N dogs" must not compete with the adopt button (#489) */
  secondaryDogsLink?: boolean;
}

/** What a rescue page shows about the rescue (#501) */
export interface RescueHeaderOrganization {
  id: number;
  name: string;
  slug?: string;
  description?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  country?: string | null;
  city?: string | null;
  service_regions?: string[] | null;
  ships_to?: string[] | null;
  social_media?: Record<string, string> | null;
  total_dogs?: number | null;
}
