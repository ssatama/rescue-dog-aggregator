/**
 * Chunk Load Error Detection and Recovery
 *
 * Handles Webpack chunk loading failures that occur when:
 * 1. User has cached old JS chunks from a previous deployment
 * 2. New deployment changes chunk hashes
 * 3. Webpack runtime tries to load modules that no longer exist
 *
 * @see https://github.com/vercel/next.js/issues/38507
 */

const CHUNK_ERROR_PATTERNS = [
  /Loading chunk [\d]+ failed/i,
  /ChunkLoadError/i,
  /Loading CSS chunk/i,
  /e\[n\]\.call/,
  /e\[n\] is not a function/,
  /undefined is not an object.*e\[n\]/,
  /Cannot read propert.*of undefined.*webpack/i,
  /\(evaluating 'e\[n\]/,
  /module factory is not available/i,
] as const;

const CHUNK_ERROR_NAMES = [
  "ChunkLoadError",
  "ScriptExternalLoadError",
] as const;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error);

  const errorName = error instanceof Error ? error.name : "";

  if (CHUNK_ERROR_NAMES.some((name) => errorName === name)) {
    return true;
  }

  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(errorMessage));
}

export function isPromiseRejectionChunkError(
  event: PromiseRejectionEvent,
): boolean {
  const reason = event.reason;

  if (reason instanceof Error) {
    return isChunkLoadError(reason);
  }

  if (typeof reason === "string") {
    return isChunkLoadError(reason);
  }

  if (reason && typeof reason === "object" && "message" in reason) {
    return isChunkLoadError(reason.message as string);
  }

  return false;
}

export async function clearBrowserCaches(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  } catch {
    // Cache API not available or failed - continue anyway
  }

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }
  } catch {
    // Service worker API not available or failed - continue anyway
  }
}

export function clearCacheAndReload(): void {
  if (typeof window === "undefined") return;

  clearBrowserCaches().finally(() => {
    // Force hard reload bypassing cache
    window.location.reload();
  });
}

export function handleChunkLoadError(error: unknown): boolean {
  if (!isChunkLoadError(error)) {
    return false;
  }

  if (typeof window !== "undefined") {
    try {
      const reloadData = localStorage.getItem("chunk_error_reload");
      const lastReloadTime = reloadData ? parseInt(reloadData, 10) : 0;
      const now = Date.now();

      // Allow one reload per 10 seconds to prevent infinite loops
      if (now - lastReloadTime > 10000) {
        localStorage.setItem("chunk_error_reload", String(now));
        clearCacheAndReload();
        return true;
      }

      // Too many reloads in short time - clear flag and let error propagate
      localStorage.removeItem("chunk_error_reload");
    } catch {
      // localStorage failed (private browsing, quota exceeded) - reload anyway
      clearCacheAndReload();
      return true;
    }
  }

  return false;
}

export function setupChunkErrorHandler(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (isPromiseRejectionChunkError(event)) {
      event.preventDefault();
      handleChunkLoadError(event.reason);
    }
  };

  const handleError = (event: ErrorEvent) => {
    if (isChunkLoadError(event.error || event.message)) {
      event.preventDefault();
      handleChunkLoadError(event.error || event.message);
    }
  };

  window.addEventListener("unhandledrejection", handleUnhandledRejection);
  window.addEventListener("error", handleError);

  return () => {
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    window.removeEventListener("error", handleError);
  };
}