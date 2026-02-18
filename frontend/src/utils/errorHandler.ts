import { logger } from "./logger";

interface ParsedApiError {
  message: string;
  code: string;
  type: string;
  retryable: boolean;
  retryAfter: number | null;
  retryAttempt?: number | null;
  maxRetries?: number | null;
  correlationId: string | null;
  detail?: string | null;
  timestamp?: string;
}

interface ApiErrorInput {
  message?: string;
  status?: number;
  data?: unknown;
}

export function parseApiError(error: ApiErrorInput): ParsedApiError {
  const defaultError: ParsedApiError = {
    message: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
    type: "internal_error",
    retryable: false,
    retryAfter: null,
    correlationId: null,
  };

  try {
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

    const data = error.data as Record<string, unknown> | null | undefined;

    if (data && data.error && typeof data.error === "object") {
      const apiError = data.error as Record<string, unknown>;
      const retry = apiError.retry as Record<string, unknown> | undefined;

      return {
        message: (apiError.message as string) || defaultError.message,
        code: (apiError.code as string) || defaultError.code,
        type: (apiError.type as string) || defaultError.type,
        retryable: (retry?.suggested as boolean) || false,
        retryAfter: (retry?.after_seconds as number) || null,
        retryAttempt: (retry?.attempt as number) || null,
        maxRetries: (retry?.max_attempts as number) || null,
        correlationId: (apiError.correlation_id as string) || null,
        detail: typeof apiError.detail === "string" ? apiError.detail : null,
        timestamp: (apiError.timestamp as string) || new Date().toISOString(),
      };
    }

    if (data && typeof data === "object") {
      if (data.type && data.code) {
        const retry = data.retry as Record<string, unknown> | undefined;
        return {
          message: (data.message as string) || defaultError.message,
          code: (data.code as string) || defaultError.code,
          type: (data.type as string) || defaultError.type,
          retryable: (retry?.suggested as boolean) || false,
          retryAfter: (retry?.after_seconds as number) || null,
          correlationId: (data.correlation_id as string) || null,
          detail: typeof data.detail === "string" ? data.detail : null,
        };
      }

      if (data.detail) {
        if (typeof data.detail === "object" && (data.detail as Record<string, unknown>).type) {
          return parseApiError({ data: { error: data.detail } });
        }

        return {
          ...defaultError,
          message: typeof data.detail === "string" ? data.detail : defaultError.message,
        };
      }
    }

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

export function formatErrorMessage(parsedError: ParsedApiError): string {
  let message = parsedError.message;

  if (parsedError.retryable && parsedError.retryAfter) {
    message += ` (Retrying in ${parsedError.retryAfter} seconds)`;
  }

  if (parsedError.retryAttempt && parsedError.maxRetries) {
    message += ` [Attempt ${parsedError.retryAttempt}/${parsedError.maxRetries}]`;
  }

  return message;
}

