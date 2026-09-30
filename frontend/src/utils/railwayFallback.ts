/**
 * While the app is unreachable, Railway's edge answers every path with its own
 * 404 "Application not found" and this header. The app never sends it, so a
 * real 404 is still a 404; this one is an outage (#659).
 */
export const isRailwayFallback = (response: Response): boolean =>
  response.status === 404 && response.headers?.get("x-railway-fallback") === "true";
