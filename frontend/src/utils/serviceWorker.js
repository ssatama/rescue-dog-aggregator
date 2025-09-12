// Service Worker registration with environment-specific handling

export const registerServiceWorker = () => {
  if (typeof window === "undefined") return;

  // Skip service worker in development unless explicitly enabled
  if (
    process.env.NODE_ENV === "development" &&
    !process.env.NEXT_PUBLIC_ENABLE_SW_DEV
  ) {
    console.log(
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
          console.log("[SW] Registration successful:", registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute
        })
        .catch((error) => {
          console.error("[SW] Registration failed:", error);
        });
    });
  }
};

export const unregisterServiceWorker = () => {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister().then((success) => {
        if (success) {
          console.log("[SW] Unregistered successfully");
        }
      });
    });
  }
};

// Clear all caches (useful for debugging)
export const clearAllCaches = async () => {
  if (typeof window === "undefined") return;

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((cacheName) => {
        console.log(`[SW] Clearing cache: ${cacheName}`);
        return caches.delete(cacheName);
      }),
    );
    console.log("[SW] All caches cleared");
  }
};
