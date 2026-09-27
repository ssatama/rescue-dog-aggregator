"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { promptInstall, useInstallMethod, type InstallMethod } from "@/lib/installApp";
import { trackAppInstallClicked, type InstallSurface } from "@/lib/analytics";
import { dismissNudge } from "@/lib/installNudge";

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
}

/** Installs the site as an app. Renders nothing where that is not possible,
 * including when the site is already running as the installed app. */
export default function InstallAppButton({
  surface,
  className,
  icon,
  labels,
}: InstallAppButtonProps) {
  const method = useInstallMethod();
  const [stepsOpen, setStepsOpen] = useState(false);

  if (!method) return null;

  const handleClick = async () => {
    trackAppInstallClicked(surface, method);
    if (method === "prompt") {
      // Anyone who has been through an install flow, from any button, is done
      // with the card. A stale prompt shows nothing, so that doesn't count.
      if (await promptInstall()) dismissNudge();
    } else {
      setStepsOpen(true);
      // iOS may discard the tab once they head to the Home Screen, before the
      // steps are closed. The card's own button waits for the close, since
      // retiring it now would unmount the steps with it.
      if (surface !== "nudge") dismissNudge();
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
          onClose={() => {
            setStepsOpen(false);
            dismissNudge();
          }}
          // From the card, the button that opened the steps is gone by now
          returnFocusToMain={surface === "nudge"}
        />
      )}
    </>
  );
}
