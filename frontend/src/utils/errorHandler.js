// src/utils/errorHandler.js

import { logger } from "./logger";

/**
 * Parse structured error response from API
 * @param {Object} error - Error object from API or fetch
 * @returns {Object} Parsed error with user-friendly message and retry info
 */
export function parseApiError(error) {
  // Default error structure
  const defaultError = {
    message: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
    type: "internal_error",
    retryable: false,
    retryAfter: null,
    correlationId: null,
  };

  try {
    // Handle network errors
    if (error.message && error.message.includes("Failed to fetch")) {
      return {
        ...defaultError,
        message:
          "Unable to connect to the server. Please check your internet connection.",
        code: "NETWORK_ERROR",
        type: "network",
        retryable: true,
        retryAfter: 5,
      };
    }

    // Handle structured error responses from our API
    if (error.data && error.data.error) {
      const apiError = error.data.error;

      return {
        message: apiError.message || defaultError.message,
        code: apiError.code || defaultError.code,
        type: apiError.type || defaultError.type,
        retryable: apiError.retry?.suggested || false,
        retryAfter: apiError.retry?.after_seconds || null,
        retryAttempt: apiError.retry?.attempt || null,
        maxRetries: apiError.retry?.max_attempts || null,
        correlationId: apiError.correlation_id || null,
        detail: apiError.detail || null,
        timestamp: apiError.timestamp || new Date().toISOString(),
      };
    }

    // Handle legacy error format (backward compatibility)
    if (error.data && typeof error.data === "object") {
      // Check if it's the new structured format without the error wrapper
      if (error.data.type && error.data.code) {
        return {
          message: error.data.message || defaultError.message,
          code: error.data.code || defaultError.code,
          type: error.data.type || defaultError.type,
          retryable: error.data.retry?.suggested || false,
          retryAfter: error.data.retry?.after_seconds || null,
          correlationId: error.data.correlation_id || null,
          detail: error.data.detail || null,
        };
      }

      // Old format with just detail
      if (error.data.detail) {
        // Check if detail is actually our structured error
        if (typeof error.data.detail === "object" && error.data.detail.type) {
          return parseApiError({ data: { error: error.data.detail } });
        }

        return {
          ...defaultError,
          message: error.data.detail,
        };
      }
    }

    // Handle status-based errors
    if (error.status) {
      switch (error.status) {
        case 404:
          return {
            ...defaultError,
            message: "The requested resource was not found",
            code: "NOT_FOUND",
            type: "not_found",
          };
        case 500:
          return {
            ...defaultError,
            message: "Server error. Please try again later.",
            code: "SERVER_ERROR",
            type: "server_error",
            retryable: true,
            retryAfter: 10,
          };
        case 503:
          return {
            ...defaultError,
            message:
              "Service temporarily unavailable. Please try again in a moment.",
            code: "SERVICE_UNAVAILABLE",
            type: "service_unavailable",
            retryable: true,
            retryAfter: 5,
          };
        default:
          return {
            ...defaultError,
            message: `Request failed with status ${error.status}`,
            code: `HTTP_${error.status}`,
          };
      }
    }

    // Fallback to error message
    if (error.message) {
      return {
        ...defaultError,
        message: error.message,
      };
    }

    return defaultError;
  } catch (parseError) {
    logger.error("Error parsing API error:", parseError);
    return defaultError;
  }
}

/**
 * Format error message for user display
 * @param {Object} parsedError - Parsed error from parseApiError
 * @returns {String} User-friendly error message
 */
export function formatErrorMessage(parsedError) {
  let message = parsedError.message;

  // Add retry information if available
  if (parsedError.retryable && parsedError.retryAfter) {
    message += ` (Retrying in ${parsedError.retryAfter} seconds)`;
  }

  // Add attempt information if available
  if (parsedError.retryAttempt && parsedError.maxRetries) {
    message += ` [Attempt ${parsedError.retryAttempt}/${parsedError.maxRetries}]`;
  }

  return message;
}

/**
 * Get user-friendly title for error type
 * @param {String} errorType - Error type from parsed error
 * @returns {String} User-friendly title
 */
function getErrorTitle(errorType) {
  const titles = {
    network: "Connection Error",
    database_connection: "Database Connection Error",
    pool_initialization: "Service Starting Up",
    query_error: "Data Error",
    validation_error: "Invalid Request",
    not_found: "Not Found",
    internal_error: "Something Went Wrong",
    server_error: "Server Error",
    service_unavailable: "Service Unavailable",
  };

  return titles[errorType] || "Error";
}
