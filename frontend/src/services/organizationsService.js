// src/services/organizationsService.js

import { get } from "../utils/api";

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
 * Fetch recent dogs from a specific organization for preview thumbnails
 * @param {number|string} idOrSlug - Organization ID or slug
 * @param {number} limit - Maximum number of dogs to fetch (default: 3)
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
    // First get all organizations with basic enhanced data from the updated API
    const organizations = await getOrganizations();

    // Ensure organizations is an array before using map
    const orgsArray = Array.isArray(organizations) ? organizations : [];

    // For organizations that need recent dog previews, fetch them in parallel
    const enhancedOrganizations = await Promise.allSettled(
      orgsArray.map(async (org) => {
        try {
          // Fetch recent dogs for preview if the organization has dogs
          const recentDogs =
            org.total_dogs > 0
              ? await getOrganizationRecentDogs(org.id, 3)
              : [];

          return {
            ...org,
            recent_dogs: recentDogs,
          };
        } catch (error) {
          // If fetching recent dogs fails, return organization without previews
          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              `Failed to fetch recent dogs for organization ${org.id}:`,
              error,
            );
          }
          return {
            ...org,
            recent_dogs: [],
          };
        }
      }),
    );

    // Extract successful results and handle any failures gracefully
    return enhancedOrganizations.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        // If enhancement failed, return original organization data
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `Enhancement failed for organization ${organizations[index].id}:`,
            result.reason,
          );
        }
        return {
          ...organizations[index],
          recent_dogs: [],
        };
      }
    });
  } catch (error) {
    // If the main organizations call fails, re-throw the error
    if (process.env.NODE_ENV !== 'production') {
      console.error("Failed to fetch enhanced organizations:", error);
    }
    throw error;
  }
}

/**
 * Fetches all organizations (alias for sitemap generation).
 * @returns {Promise<Array>} - Promise resolving to an array of organization objects.
 */
export async function getAllOrganizations() {
  return getOrganizations();
}
