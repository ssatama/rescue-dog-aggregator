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
}

export interface OrganizationHeroProps {
  organization: OrganizationCardData;
}

export interface OrganizationSectionProps {
  organization: OrganizationCardData;
  organizationId: number | string;
}
