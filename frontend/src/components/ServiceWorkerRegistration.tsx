"use client";

import { useEffect } from "react";
import { logger, reportError } from "../utils/logger";

const registerServiceWorker = async (): Promise<void> => {
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");

    logger.log("[SW] Service Worker registered successfully");

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          logger.log("[SW] New Service Worker available");

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
    logger.error("[SW] Service Worker registration failed:", error);
    reportError(error, { context: "ServiceWorkerRegistration" });
  }
};

export default function ServiceWorkerRegistration(): null {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      logger.log("[SW] Service Workers not supported");
      return;
    }

    registerServiceWorker();
  }, []);

  return null;
}
