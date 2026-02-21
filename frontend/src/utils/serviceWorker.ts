import { logger } from "./logger";

export const registerServiceWorker = (): void => {
  if (typeof window === "undefined") return;

  if (
    process.env.NODE_ENV === "development" &&
    !process.env.NEXT_PUBLIC_ENABLE_SW_DEV
  ) {
    logger.log(
      "[SW] Skipping registration in development. Set NEXT_PUBLIC_ENABLE_SW_DEV=true to enable.",
    );
    unregisterServiceWorker();
    return;
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          logger.log("[SW] Registration successful:", registration.scope);

          setInterval(() => {
            registration.update();
          }, 60000);
        })
        .catch((error: unknown) => {
          logger.error("[SW] Registration failed:", error);
        });
    });
  }
};

export const unregisterServiceWorker = (): void => {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister().then((success) => {
        if (success) {
          logger.log("[SW] Unregistered successfully");
        }
      });
    });
  }
};

export const clearAllCaches = async (): Promise<void> => {
  if (typeof window === "undefined") return;

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((cacheName) => {
        logger.log(`[SW] Clearing cache: ${cacheName}`);
        return caches.delete(cacheName);
      }),
    );
    logger.log("[SW] All caches cleared");
  }
};
