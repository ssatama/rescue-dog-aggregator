// src/services/organizationsService.js

import { get } from "../utils/api";
import { trackAPIPerformance } from "../utils/performanceMonitor";

/**
 * Fetch all organizations
 * @returns {Promise} - Resolved promise with organizations data
 */
export async function getOrganizations() {
  return get("/api/organizations");
}

/**
 * Fetch a specific organization by ID
 * @param {number|string} id - Organization ID
 * @returns {Promise} - Resolved promise with organization data
 */
export async function getOrganizationById(id) {
  return get(`/api/organizations/${id}`);
}

/**
 * Fetch a specific organization by slug
 * @param {string} slug - Organization slug
 * @returns {Promise} - Resolved promise with organization data
 */
export async function getOrganizationBySlug(slug) {
  return get(`/api/organizations/${slug}`);
}

/**
 * Fetch dogs from a specific organization
 * @param {number|string} idOrSlug - Organization ID or slug
 * @param {Object} params - Filter and pagination parameters
 * @returns {Promise} - Resolved promise with dogs data
 */
export async function getOrganizationDogs(idOrSlug, params = {}) {
  return get("/api/animals", {
    ...params,
    organization_id: idOrSlug,
    animal_type: "dog", // Also explicitly filter for dogs here
  });
}

/**
 * Fetch statistics for a specific organization
 * @param {number|string} idOrSlug - Organization ID or slug
 * @returns {Promise} - Resolved promise with organization statistics
 */
export async function getOrganizationStatistics(idOrSlug) {
  return get(`/api/organizations/${idOrSlug}/statistics`);
}

/**
 * Fetch recent dogs for a specific organization
 * @param {number|string} idOrSlug - Organization ID or slug
 * @param {number} limit - Maximum number of recent dogs to fetch (default: 3)
 * @returns {Promise} - Resolved promise with recent dogs data
 */
export async function getOrganizationRecentDogs(idOrSlug, limit = 3) {
  return get(`/api/organizations/${idOrSlug}/recent-dogs`, { limit });
}


/**
 * Fetch enhanced organizations data with statistics and recent dogs
 * This is an optimized version that fetches all needed data in fewer API calls
 * @returns {Promise} - Resolved promise with enhanced organizations data
 */
export async function getEnhancedOrganizations() {
  try {
    // Fetch enhanced organizations data directly from the enhanced endpoint
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    
    const response = await fetch(`${apiUrl}/api/organizations/enhanced`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch organizations: ${response.status}`);
    }

    const organizations = await response.json();
    const orgsArray = Array.isArray(organizations) ? organizations : [];

    // Map the data to ensure consistent field names
    const enhancedOrganizations = orgsArray.map((org) => ({
      ...org,
      recent_dogs: (org.recent_dogs || []).map(dog => ({
        ...dog,
        // Map image_url to the expected fields
        thumbnail_url: dog.thumbnail_url || dog.image_url,
        primary_image_url: dog.primary_image_url || dog.image_url
      })),
      total_dogs: org.total_dogs || 0,
      new_this_week: org.new_this_week || 0,
      website_url: org.website_url || org.websiteUrl,
      logo_url: org.logo_url || org.logoUrl,
      social_media: org.social_media || org.socialMedia || {},
      service_regions: org.service_regions || org.serviceRegions || [],
      ships_to: org.ships_to || org.shipsTo || [],
    }));

    return enhancedOrganizations;
  } catch (error) {
    // If the fetch fails, re-throw the error
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to fetch enhanced organizations:", error);
    }
    throw error;
  }
}

export async function getEnhancedOrganizationsSSR() {
  const startTime = Date.now();
  
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    
    const response = await fetch(`${apiUrl}/api/organizations/enhanced`, {
      next: { revalidate: 300 },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch organizations: ${response.status}`);
    }

    const organizations = await response.json();
    
    // Track API performance
    if (typeof window !== 'undefined') {
      trackAPIPerformance('/api/organizations/enhanced', startTime);
    }
    
    const orgsArray = Array.isArray(organizations) ? organizations : [];
    
    const enhancedOrganizations = orgsArray.map((org) => ({
      ...org,
      recent_dogs: (org.recent_dogs || []).map(dog => ({
        ...dog,
        // Map image_url to the expected fields
        thumbnail_url: dog.thumbnail_url || dog.image_url,
        primary_image_url: dog.primary_image_url || dog.image_url
      })),
      total_dogs: org.total_dogs || 0,
      new_this_week: org.new_this_week || 0,
      website_url: org.website_url || org.websiteUrl,
      logo_url: org.logo_url || org.logoUrl,
      social_media: org.social_media || org.socialMedia || {},
      service_regions: org.service_regions || org.serviceRegions || [],
      ships_to: org.ships_to || org.shipsTo || [],
    }));

    return enhancedOrganizations;
  } catch (error) {
    console.error("Failed to fetch enhanced organizations (SSR):", error);
    return [];
  }
}

/**
 * Fetches all organizations (alias for sitemap generation).
 * @returns {Promise<Array>} - Promise resolving to an array of organization objects.
 */
export async function getAllOrganizations() {
  return getOrganizations();
}
