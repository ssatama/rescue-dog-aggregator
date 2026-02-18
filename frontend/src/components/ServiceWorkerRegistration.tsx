"use client";

import { useEffect } from "react";

const registerServiceWorker = async (): Promise<void> => {
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const isDevelopment = process.env.NODE_ENV === "development";

    if (isDevelopment) {
      console.log("[SW] Service Worker registered successfully");
    }

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          if (isDevelopment) {
            console.log("[SW] New Service Worker available");
          }

          if (registration.waiting) {
            registration.waiting.postMessage({ action: "skipWaiting" });
          }
        }
      });
    });

    if (registration.waiting) {
      registration.waiting.postMessage({ action: "skipWaiting" });
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    setInterval(
      () => {
        registration.update();
      },
      60 * 60 * 1000,
    );
  } catch (error: unknown) {
    const isDevelopment = process.env.NODE_ENV === "development";
    if (isDevelopment) {
      console.error("[SW] Service Worker registration failed:", error);
    }
  }
};

export default function ServiceWorkerRegistration(): null {
  useEffect(() => {
    const isDevelopment = process.env.NODE_ENV === "development";

    if (!("serviceWorker" in navigator)) {
      if (isDevelopment) {
        console.log("[SW] Service Workers not supported");
      }
      return;
    }

    registerServiceWorker();
  }, []);

  return null;
}
