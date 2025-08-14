"use client";

/**
 * Service Worker Registration Component
 * Handles registration and updates of the service worker
 */
import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register in production
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    // Check if service workers are supported
    if (!("serviceWorker" in navigator)) {
      if (process.env.NODE_ENV === "development") {
        console.log("[SW] Service Workers not supported");
      }
      return;
    }

    // Register service worker
    registerServiceWorker();
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      if (process.env.NODE_ENV === "development") {
        console.log("[SW] Service Worker registered successfully");
      }

      // Handle updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New service worker available
            if (process.env.NODE_ENV === "development") {
              console.log("[SW] New Service Worker available");
            }

            // Optionally show update notification to user
            // For now, we'll auto-update
            if (registration.waiting) {
              registration.waiting.postMessage({ action: "skipWaiting" });
            }
          }
        });
      });

      // Handle immediate activation if worker is waiting
      if (registration.waiting) {
        registration.waiting.postMessage({ action: "skipWaiting" });
      }

      // Listen for controller changes and reload
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      // Check for updates every hour
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000,
      );
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[SW] Service Worker registration failed:", error);
      }
    }
  };

  // This component doesn't render anything
  return null;
}
