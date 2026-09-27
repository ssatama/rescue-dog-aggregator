import { useSyncExternalStore } from "react";
import { trackAppInstalled } from "@/lib/analytics";
import { isStandalone } from "@/lib/displayMode";

// How this browser can install the site as an app, if it can at all.
//
// - `prompt`: Chrome, Edge and Samsung Internet (Android, Windows, macOS) fire
//   `beforeinstallprompt`, and we open their own install dialog.
// - `ios`: every iOS browser can Add to Home Screen from the Share sheet, but
//   there is no API, so we show the steps.
// - `mac-safari`: Safari 17+ has File > Add to Dock, again with no API.
//
// There is no service worker on purpose: none of these need one, and the last
// one served stale API data (#159).

export type InstallMethod = "prompt" | "ios" | "mac-safari";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    /** Set by the inline script in the root layout, which runs before React
     * and so catches an event that fires before hydration. */
    __installPrompt?: BeforeInstallPromptEvent;
  }
}

// In-app browsers (Instagram, Facebook, TikTok...) have no Share sheet entry
const IN_APP_BROWSER = /FBAN|FBAV|Instagram|Line\/|TikTok|Snapchat/;

/** The install route that needs instructions, from the user agent. */
export function manualInstallMethod(
  userAgent: string,
  maxTouchPoints: number,
): "ios" | "mac-safari" | null {
  if (IN_APP_BROWSER.test(userAgent)) return null;
  // iPadOS asks for the desktop site, so it reports a Mac with a touch screen
  if (/iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Macintosh/.test(userAgent) && !/Chrome|Chromium|Edg|Firefox|OPR/.test(userAgent)) {
    const version = Number(/Version\/(\d+)/.exec(userAgent)?.[1]);
    if (version >= 17) return "mac-safari";
  }
  return null;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let listening = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function listen(): void {
  if (listening) return;
  listening = true;
  deferredPrompt = window.__installPrompt ?? null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    trackAppInstalled();
    emit();
  });
}

function subscribe(listener: () => void): () => void {
  listen();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getInstallMethod(): InstallMethod | null {
  if (installed || isStandalone()) return null;
  if (deferredPrompt) return "prompt";
  return manualInstallMethod(navigator.userAgent, navigator.maxTouchPoints);
}

/** Null when the site is already installed or this browser cannot install it. */
export function useInstallMethod(): InstallMethod | null {
  return useSyncExternalStore(subscribe, getInstallMethod, () => null);
}

/** Opens the browser's install dialog. Each prompt can be shown only once. */
export async function promptInstall(): Promise<void> {
  const prompt = deferredPrompt;
  if (!prompt) return;
  deferredPrompt = null;
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  if (outcome === "accepted") installed = true;
  emit();
}
