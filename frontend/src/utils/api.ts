import type { ZodType } from "zod";
import { logger, reportError } from "./logger";
import { parseApiError, formatErrorMessage } from "./errorHandler";
import { getApiUrl } from "./apiConfig";

const API_BASE_URL = getApiUrl();

interface ParsedApiError {
  message: string;
  code: string;
  type: string;
  retryable: boolean;
  retryAfter: number | null;
  correlationId: string | null;
}

interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

type QueryParams = Record<string, unknown>;

export async function fetchApi(
  endpoint: string,
  options: RequestInit = {},
): Promise<unknown> {
  const url = `${API_BASE_URL}${endpoint}`;

  logger.log(`[api fetchApi] Fetching absolute URL: ${url}`);

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const fetchOptions: RequestInit = {
    ...defaultOptions,
    ...options,
  };

  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const error: ApiError = new Error(
        errorData?.detail ||
          errorData?.message ||
          `API error: ${response.status} ${response.statusText}`,
      );
      error.status = response.status;
      error.data = errorData;

      const parsedError = parseApiError(error) as ParsedApiError;
      const errorMessage = formatErrorMessage(parsedError) as string;

      logger.error(`[API Error] ${errorMessage}`, {
        endpoint,
        status: response.status,
        code: parsedError.code,
        correlationId: parsedError.correlationId,
      });

      throw error;
    }

    const data: unknown = await response.json();
    return data;
  } catch (error) {
    const err = error as ApiError;
    if (err.name === "AbortError" || err.message?.includes("aborted")) {
      logger.log(`[API] Request cancelled: ${endpoint}`);
      throw error;
    }

    if (!err.status) {
      const parsedError = parseApiError(err) as ParsedApiError;
      const errorMessage = formatErrorMessage(parsedError) as string;
      reportError(errorMessage, {
        endpoint,
        code: parsedError.code,
        retryable: parsedError.retryable,
      });
    }
    throw error;
  }
}

export function get<T = unknown>(
  endpoint: string,
  params: QueryParams = {},
  options: RequestInit & { schema?: ZodType<T> } = {},
): Promise<T> {
  let normalizedEndpoint = endpoint;

  const pathSegments = endpoint
    .split("/")
    .filter((segment) => segment.length > 0);

  if (pathSegments.length === 2 && !endpoint.endsWith("/")) {
    normalizedEndpoint = `${endpoint}/`;
  } else if (pathSegments.length >= 3 && endpoint.endsWith("/")) {
    normalizedEndpoint = endpoint.slice(0, -1);
  }

  const queryString = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .flatMap((key) => {
      const value = params[key];
      if (Array.isArray(value)) {
        return value.map(
          (item) => `${encodeURIComponent(key)}=${encodeURIComponent(item)}`,
        );
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    })
    .join("&");

  const url = queryString
    ? `${normalizedEndpoint}?${queryString}`
    : normalizedEndpoint;

  logger.log(`[api get] Calling fetchApi with smart-normalized URL: ${url}`);

  const { schema, ...fetchOptions } = options;

  const result = fetchApi(url, fetchOptions).then((data) => {
    if (schema) {
      return schema.parse(data) as T;
    }
    return data as T;
  });

  return result;
}

export function post<T = unknown>(
  endpoint: string,
  data: unknown,
): Promise<T> {
  return fetchApi(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  }) as Promise<T>;
}
