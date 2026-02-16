import { SwipeResponseSchema } from "../schemas/animals";
import { stripNulls } from "../utils/api";

interface SwipeFilters {
  country?: string;
  sizes?: string[];
  limit?: number;
  offset?: number;
}

export interface SwipeDog {
  id: number;
  name: string;
  breed?: string;
  age?: string;
  age_min_months?: number;
  age_max_months?: number;
  image?: string;
  organization?: string;
  location?: string;
  slug: string;
  description?: string;
  traits?: string[];
  energy_level?: number | string;
  special_characteristic?: string;
  quality_score?: number;
  created_at?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchSwipeDogs(
  filters: SwipeFilters,
): Promise<SwipeDog[]> {
  const params = new URLSearchParams();

  if (filters.country) {
    params.append("country", filters.country);
  }

  if (filters.sizes && filters.sizes.length > 0) {
    filters.sizes.forEach((size) => params.append("size", size));
  }

  params.append("limit", String(filters.limit || 20));
  params.append("offset", String(filters.offset || 0));

  const response = await fetch(
    `${API_BASE_URL}/api/dogs/swipe?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch dogs: ${response.statusText}`);
  }

  const raw: unknown = await response.json();
  const data = SwipeResponseSchema.parse(stripNulls(raw));

  return data.dogs.map((dog) => ({
    id: dog.id,
    name: dog.name,
    breed: dog.breed,
    age: dog.age,
    age_min_months: dog.age_min_months,
    age_max_months: dog.age_max_months,
    image:
      dog.image_url || dog.primary_image_url || dog.main_image || dog.image,
    organization:
      dog.organization_name ||
      (typeof dog.organization === "object"
        ? dog.organization?.name
        : dog.organization),
    location: dog.location,
    slug: dog.slug,
    description: dog.tagline || dog.description,
    traits: dog.personality_traits || [],
    energy_level: dog.energy_level,
    special_characteristic: dog.unique_quirk || dog.special_characteristic,
    quality_score: dog.quality_score,
    created_at: dog.created_at,
  }));
}
