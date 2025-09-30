/**
 * Centralized API URL configuration
 * Handles client-side vs server-side URL resolution
 */
export const getApiUrl = (): string => {
  if (
    typeof window === "undefined" &&
    (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test")
  ) {
    return "http://localhost:8000";
  }
  return process.env.NEXT_PUBLIC_API_URL || "https://api.rescuedogs.me";
};
