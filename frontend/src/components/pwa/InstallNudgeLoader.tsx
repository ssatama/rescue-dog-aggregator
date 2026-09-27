"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { canEverInstall } from "@/lib/installApp";

/** The card is for phones and tablets that can install the site: elsewhere
 * (desktop, the installed app, in-app browsers) its code isn't even fetched.
 * A plain import(), not next/dynamic, which Next preloads on every page. */
export default function InstallNudgeLoader() {
  const isTouch = useMediaQuery("(pointer: coarse)");
  const [InstallNudge, setInstallNudge] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (!isTouch || !canEverInstall()) return;
    let cancelled = false;
    import("./InstallNudge").then((module) => {
      if (!cancelled) setInstallNudge(() => module.default);
    });
    return () => {
      cancelled = true;
    };
  }, [isTouch]);

  return InstallNudge ? <InstallNudge /> : null;
}
