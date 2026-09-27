"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Whether this tab has moved between the site's pages since it loaded. A
// visitor who lands on a dog from Google or a shared link has nothing on the
// site to go back to, so "Back" must go somewhere else (#518).
let navigated = false;

export function hasInAppHistory(): boolean {
  return navigated;
}

/** Mounted once in the root layout; renders nothing. */
export default function InAppHistoryTracker(): null {
  const pathname = usePathname();
  const landing = useRef(pathname);
  useEffect(() => {
    if (pathname !== landing.current) navigated = true;
  }, [pathname]);
  return null;
}

/** Test hook: start each test as a fresh landing. */
export function resetInAppHistoryForTests(): void {
  navigated = false;
}
