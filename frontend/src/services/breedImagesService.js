// Use internal URL for server-side requests in development
const API_URL =
  process.env.NODE_ENV === "development" && typeof window === "undefined"
    ? "http://localhost:8000" // Server-side in dev
    : process.env.NEXT_PUBLIC_API_URL || "https://api.rescuedogs.me";

export async function getBreedsWithImages(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.breedType) queryParams.append('breed_type', params.breedType);
  if (params.breedGroup) queryParams.append('breed_group', params.breedGroup);
  if (params.minCount !== undefined) queryParams.append('min_count', params.minCount);
  if (params.limit) queryParams.append('limit', params.limit);
  
  const queryString = queryParams.toString();
  const url = `${API_URL}/api/animals/breeds/with-images${queryString ? `?${queryString}` : ''}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 } // 5 minute cache
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch breeds with images: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching breeds with images:', error);
    return [];
  }
}

export async function getMixedBreedData() {
  return getBreedsWithImages({
    breedType: 'mixed',
    limit: 1
  }).then(breeds => breeds[0] || null);
}

export async function getPopularBreedsWithImages(limit = 8) {
  return getBreedsWithImages({
    minCount: 15,
    limit
  });
}