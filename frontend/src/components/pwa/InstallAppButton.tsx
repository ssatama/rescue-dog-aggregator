"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { promptInstall, useInstallMethod, type InstallMethod } from "@/lib/installApp";
import { trackAppInstallClicked, type InstallSurface } from "@/lib/analytics";

// Only a few visitors open the steps, so they load on demand
const InstallInstructions = dynamic(() => import("./InstallInstructions"), { ssr: false });

const LABELS: Record<InstallMethod, string> = {
  prompt: "Install app",
  ios: "Add to Home Screen",
  "mac-safari": "Add to Dock",
};

interface InstallAppButtonProps {
  surface: InstallSurface;
  className?: string;
  /** Shown before the label. Props only, no render function: the footer is a
   * server component. */
  icon?: React.ReactNode;
  /** Replaces the default label for some install methods. */
  labels?: Partial<Record<InstallMethod, string>>;
  /** After the browser's dialog is answered or the steps are closed; not when
   * the browser showed nothing. */
  onDone?: () => void;
}

/** Installs the site as an app. Renders nothing where that is not possible,
 * including when the site is already running as the installed app. */
export default function InstallAppButton({
  surface,
  className,
  icon,
  labels,
  onDone,
}: InstallAppButtonProps) {
  const method = useInstallMethod();
  const [stepsOpen, setStepsOpen] = useState(false);

  if (!method) return null;

  const handleClick = async () => {
    trackAppInstallClicked(surface, method);
    if (method === "prompt") {
      // A stale prompt shows nothing, and the card should not retire for that
      if (await promptInstall()) onDone?.();
    } else {
      setStepsOpen(true);
    }
  };

  return (
    <>
      <button type="button" onClick={handleClick} className={className}>
        {icon}
        {labels?.[method] ?? LABELS[method]}
      </button>
      {stepsOpen && method !== "prompt" && (
        <InstallInstructions
          method={method}
          open
          onOpenChange={(open) => {
            if (open) return;
            setStepsOpen(false);
            onDone?.();
          }}
        />
      )}
    </>
  );
}
