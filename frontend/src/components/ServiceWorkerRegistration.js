"use client";

/**
 * Service Worker Registration Component
 * Handles registration and updates of the service worker
 */
import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Register in production and development (for debugging Safari issues)
    const isDevelopment = process.env.NODE_ENV === "development";
    
    // Check if service workers are supported
    if (!("serviceWorker" in navigator)) {
      if (isDevelopment) {
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
      const isDevelopment = process.env.NODE_ENV === "development";
      
      if (isDevelopment) {
        console.log("[SW] Service Worker registered successfully");
      }

      // Send Sentry configuration to service worker
      const sendSentryConfig = () => {
        const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || 
          "https://3e013eea839f1016a4d06f3ec78d1407@o4509932462800896.ingest.de.sentry.io/4509932479250512";
        
        if (registration.active) {
          registration.active.postMessage({
            action: 'configureSentry',
            dsn: sentryDsn
          });
        }
      };

      // Send config immediately if service worker is active
      if (registration.active) {
        sendSentryConfig();
      }

      // Handle updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "activated") {
            // Send Sentry config to newly activated worker
            sendSentryConfig();
          }
          
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New service worker available
            if (isDevelopment) {
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
          // Send config to new controller before reload
          sendSentryConfig();
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
      const isDevelopment = process.env.NODE_ENV === "development";
      if (isDevelopment) {
        console.error("[SW] Service Worker registration failed:", error);
      }
    }
  };

  // This component doesn't render anything
  return null;
}