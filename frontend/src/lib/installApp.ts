import { useSyncExternalStore } from "react";
import { trackAppInstalled } from "@/lib/analytics";
import { isStandalone } from "@/lib/displayMode";

// How this browser can install the site as an app, if it can at all.
//
// - `prompt`: Chrome, Edge and Samsung Internet (Android, Windows, macOS) fire
//   `beforeinstallprompt`, and we open their own install dialog.
// - `ios`: every iOS browser can Add to Home Screen from the Share sheet, but
//   there is no API, so we show the steps.
// - `mac-safari`: Safari on Sonoma or later has File > Add to Dock, again with
//   no API.
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
    /** The only copy of Chrome's deferred prompt. The inline script in the
     * root layout sets it, before hydration, and announces it with
     * `installpromptchange`; `promptInstall` clears it. */
    __installPrompt?: BeforeInstallPromptEvent;
  }
}

// In-app browsers (Instagram, Facebook, TikTok, the Google app...) have no
// Add to Home Screen
const IN_APP_BROWSER = /FBAN|FBAV|Instagram|Line\/|TikTok|Snapchat|GSA\//;

/** The install route that needs instructions, from the user agent. */
export function manualInstallMethod(
  userAgent: string,
  maxTouchPoints: number,
): "ios" | "mac-safari" | null {
  if (IN_APP_BROWSER.test(userAgent)) return null;
  // iPadOS asks for the desktop site, so it reports a Mac with a touch screen
  if (/iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) {
    // Apps' web views (LinkedIn, Gmail, Slack...) have no Safari/ token and no
    // Share sheet entry
    if (!/Safari\//.test(userAgent)) return null;
    // Chrome, Firefox and Edge on iOS got Add to Home Screen in iOS 16.4. An
    // iPad asking for the desktop site hides its version; assume a recent one.
    const iosVersion = /OS (\d+)_(\d+)/.exec(userAgent);
    if (/CriOS|FxiOS|EdgiOS/.test(userAgent) && iosVersion) {
      const [major, minor] = [Number(iosVersion[1]), Number(iosVersion[2])];
      if (major < 16 || (major === 16 && minor < 4)) return null;
    }
    return "ios";
  }
  if (/Macintosh/.test(userAgent) && !/Chrome|Chromium|Edg|Firefox|OPR/.test(userAgent)) {
    // Add to Dock needs macOS Sonoma. Safari always reports macOS 10_15_7, and
    // 17 and 18 also run on Monterey and Ventura; 26 needs Sonoma or later.
    const version = Number(/Version\/(\d+)/.exec(userAgent)?.[1]);
    if (version >= 26) return "mac-safari";
  }
  return null;
}

let installed = false;
// Neither changes during a page's life, so work them out once
let standalone: boolean | undefined;
let manualMethod: ReturnType<typeof manualInstallMethod> | undefined;
let listening = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function listen(): void {
  if (listening) return;
  listening = true;
  window.addEventListener("installpromptchange", emit);
  window.addEventListener("appinstalled", () => {
    installed = true;
    window.__installPrompt = undefined;
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
  standalone ??= isStandalone();
  if (installed || standalone) return null;
  if (window.__installPrompt) return "prompt";
  if (manualMethod === undefined) {
    manualMethod = manualInstallMethod(navigator.userAgent, navigator.maxTouchPoints);
  }
  return manualMethod;
}

/** Null when the site is already installed or this browser cannot install it. */
export function useInstallMethod(): InstallMethod | null {
  return useSyncExternalStore(subscribe, getInstallMethod, () => null);
}

/** Opens the browser's install dialog. Each prompt can be shown only once. */
export async function promptInstall(): Promise<void> {
  const prompt = window.__installPrompt;
  if (!prompt) return;
  window.__installPrompt = undefined;
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") installed = true;
  } catch {
    // A stale prompt (installed from the address bar meanwhile) rejects.
    // Nothing to report: the button falls back to what the browser offers now.
  } finally {
    emit();
  }
}
