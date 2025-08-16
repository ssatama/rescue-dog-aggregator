"use client";

/**
 * Session management utility for generating unique session IDs
 * Used for analytics tracking (when implemented)
 */

export function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = sessionStorage.getItem("sessionId");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("sessionId", sessionId);
  }
  return sessionId;
}

export function clearSessionId(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("sessionId");
}
