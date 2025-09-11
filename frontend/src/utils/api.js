// src/utils/api.js

import { logger, reportError } from "./logger";
import { parseApiError, formatErrorMessage, withRetry } from "./errorHandler";

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
          errorData?.message ||
          `API error: ${response.status} ${response.statusText}`,
      );
      error.status = response.status;
      error.data = errorData;

      // Parse and log the error with context
      const parsedError = parseApiError(error);
      const errorMessage = formatErrorMessage(parsedError);

      logger.error(`[API Error] ${errorMessage}`, {
        endpoint,
        status: response.status,
        code: parsedError.code,
        correlationId: parsedError.correlationId,
      });

      throw error;
    }

    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    // Check if the error is from an aborted request (user cancelled)
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      // Don't report aborted requests as errors - they're intentional
      logger.log(`[API] Request cancelled: ${endpoint}`);
      throw error;
    }
    
    // If it's not already processed, parse it
    if (!error.status) {
      const parsedError = parseApiError(error);
      const errorMessage = formatErrorMessage(parsedError);
      reportError(errorMessage, {
        endpoint,
        code: parsedError.code,
        retryable: parsedError.retryable,
      });
    }
    throw error;
  }
}

/**
 * Helper for GET requests
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise} - Resolved promise with response data
 */
export function get(endpoint, params = {}, options = {}) {
  // Smart trailing slash normalization based on endpoint pattern
  // Collection endpoints (ending with resource name) need trailing slash: /api/organizations/
  // Item endpoints (with parameter) should NOT have trailing slash: /api/organizations/slug
  let normalizedEndpoint = endpoint;

  // Count the number of path segments to determine if it's a collection or item endpoint
  const pathSegments = endpoint
    .split("/")
    .filter((segment) => segment.length > 0);
  const lastSegment = pathSegments[pathSegments.length - 1];

  // If endpoint has exactly 2 segments (/api/organizations), it's a collection - needs trailing slash
  if (pathSegments.length === 2 && !endpoint.endsWith("/")) {
    normalizedEndpoint = `${endpoint}/`;
  }
  // If endpoint has 3+ segments (/api/organizations/slug), it's an item - remove trailing slash
  else if (pathSegments.length >= 3 && endpoint.endsWith("/")) {
    normalizedEndpoint = endpoint.slice(0, -1);
  }

  // Build query string from params
  const queryString = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .flatMap((key) => {
      const value = params[key];
      // Handle array values by creating multiple parameters with the same key
      if (Array.isArray(value)) {
        return value.map(
          (item) => `${encodeURIComponent(key)}=${encodeURIComponent(item)}`,
        );
      }
      // Handle single values
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join("&");

  const url = queryString
    ? `${normalizedEndpoint}?${queryString}`
    : normalizedEndpoint;

  logger.log(`[api.js get] Calling fetchApi with smart-normalized URL: ${url}`);

  return fetchApi(url, options);
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
