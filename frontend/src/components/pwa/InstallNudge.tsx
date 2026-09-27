"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import InstallAppButton from "./InstallAppButton";
import { useInstallMethod } from "@/lib/installApp";
import {
  canNudge,
  dismissNudge,
  markNudgeShown,
  recordSeen,
  recordVisit,
  useNudgeDue,
} from "@/lib/installNudge";
import { trackInstallNudgeDismissed, trackInstallNudgeShown } from "@/lib/analytics";

// /dogs/<slug>-<id>; /dogs/puppies and /dogs/country/... are listings
const DOG_PAGE = /^\/dogs\/[^/]+-\d+$/;

/** A one-time card on phones and tablets suggesting the home screen app, once
 * someone is on their third visit or has looked at five dogs. It stays for that
 * session, then retires whether or not it was used. The menu and the footer
 * offer the same thing all the time; this is the only push. */
export default function InstallNudge() {
  const method = useInstallMethod();
  const pathname = usePathname();
  const due = useNudgeDue();
  // False until this visit is counted, so a card due last session can't flash
  const [visitCounted, setVisitCounted] = useState(false);
  // Client-only (InstallNudgeLoader imports it after mount), so the document is here
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState === "visible");
  const cardRef = useRef<HTMLElement>(null);

  // Every page is activity, so a long visit stays one session
  useEffect(() => {
    // A tab opened in the background isn't a visit until it's looked at; the
    // visibilitychange handler records it then
    if (document.visibilityState === "visible") recordVisit();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the visit count lives in localStorage, readable only after mount
    setVisitCounted(true);
  }, [pathname]);

  useEffect(() => {
    // Coming back to a tab left open counts as a visit too
    const onVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setTabVisible(visible);
      if (visible) recordVisit();
      else recordSeen();
    };
    // Scrolling and filtering on one page is activity too, noted once a
    // minute. A visit, not just "seen": after a long idle spell it's a new one.
    let lastActivity = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivity < 60_000) return;
      lastActivity = now;
      recordVisit(now);
    };
    const activity = ["scroll", "pointerdown", "keydown"] as const;
    document.addEventListener("visibilitychange", onVisibilityChange);
    activity.forEach((type) => window.addEventListener(type, onActivity, { passive: true }));
    // Installed from the browser's own menu or address bar
    window.addEventListener("appinstalled", dismissNudge);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      activity.forEach((type) => window.removeEventListener(type, onActivity));
      window.removeEventListener("appinstalled", dismissNudge);
    };
  }, []);

  const shown =
    visitCounted &&
    due &&
    method !== null &&
    canNudge() &&
    // Dogs first: the mobile home stays dogs-only (AGENTS.md)
    pathname !== "/" &&
    !pathname?.startsWith("/swipe") &&
    // A dog page's adopt bar owns the bottom edge, even while the dog loads
    !DOG_PAGE.test(pathname ?? "");

  // Seen once it is really on screen for a second: not in a background tab
  // (a storage event can render it there), and not hidden by the adopt-bar CSS
  useEffect(() => {
    if (!shown || !method || !tabVisible) return;
    const timer = setTimeout(() => {
      const card = cardRef.current;
      if (card && getComputedStyle(card).display !== "none" && markNudgeShown()) {
        trackInstallNudgeShown(method);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [shown, method, pathname, tabVisible]);

  if (!shown || !method) return null;

  // Acting within the first second still means it was seen
  const noteSeen = () => {
    if (markNudgeShown()) trackInstallNudgeShown(method);
  };

  return (
    <motion.section
      ref={cardRef}
      aria-label="Add Rescue Dogs to your home screen"
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      // Sits above the tab bar. Also hidden wherever an adopt bar is, in case a
      // dog's URL doesn't end in its id (a fallback slug)
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-line bg-surface p-4 shadow-xl max-lg:[body:has([data-adopt-bar])_&]:hidden sm:left-auto sm:w-96 lg:bottom-6 lg:right-6"
    >
      <button
        type="button"
        onClick={() => {
          noteSeen();
          trackInstallNudgeDismissed(method);
          dismissNudge();
        }}
        className="absolute right-2 top-2 rounded-lg p-2 text-subtle transition-colors hover:bg-soft hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex gap-3 pr-6">
        <Image
          src="/apple-touch-icon.png"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-xl border border-line"
        />
        <div>
          <p className="font-display font-bold text-ink">Keep the dogs one tap away</p>
          <p className="mt-0.5 text-sm text-subtle">
            Add Rescue Dogs to your home screen. No app store, no account.
          </p>
        </div>
      </div>

      <div onClickCapture={noteSeen}>
        <InstallAppButton
          surface="nudge"
          className="mt-3 w-full rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-orange-400 dark:text-gray-950 dark:hover:bg-orange-300"
          labels={{ prompt: "Install", ios: "Show me how" }}
        />
      </div>
    </motion.section>
  );
}
