// src/utils/api.js

import { logger, reportError } from "./logger";

// Base API URL - configurable based on environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Base fetch function with error handling
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise} - Resolved promise with response data
 */
export async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`; // Endpoint here is relative already

  logger.log(`[api.js fetchApi] Fetching absolute URL: ${url}`);

  // Default options
  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const fetchOptions = {
    ...defaultOptions,
    ...options,
  };

  try {
    const response = await fetch(url, fetchOptions);

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const error = new Error(
        errorData?.detail ||
          `API error: ${response.status} ${response.statusText}`,
      );
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    reportError("API request failed", { endpoint, error: error.message });
    throw error;
  }
}

/**
 * Helper for GET requests
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise} - Resolved promise with response data
 */
export function get(endpoint, params = {}) {
  // Build query string from params
  const queryString = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`,
    )
    .join("&");

  const url = queryString ? `${endpoint}?${queryString}` : endpoint;

  logger.log(`[api.js get] Calling fetchApi with relative URL: ${url}`);

  return fetchApi(url);
}

/**
 * Helper for POST requests
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body data
 * @returns {Promise} - Resolved promise with response data
 */
export function post(endpoint, data) {
  return fetchApi(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Additional helper methods can be added as needed (PUT, DELETE, etc.)
