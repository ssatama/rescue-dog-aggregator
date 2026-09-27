"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Share, SquarePlus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ManualMethod = "ios" | "mac-safari";

interface Step {
  icon?: LucideIcon;
  text: React.ReactNode;
}

const GUIDES: Record<ManualMethod, { title: string; steps: Step[]; note?: string }> = {
  ios: {
    title: "Add Rescue Dogs to your Home Screen",
    steps: [
      {
        icon: Share,
        text: (
          <>
            Tap <strong>Share</strong>. In Safari on iOS 26 it&apos;s under the{" "}
            <strong>&middot;&middot;&middot;</strong> button
          </>
        ),
      },
      {
        icon: SquarePlus,
        text: (
          <>
            Choose <strong>Add to Home Screen</strong>. Scroll the list if you
            don&apos;t see it
          </>
        ),
      },
      { text: <>Tap <strong>Add</strong></> },
    ],
    // iOS gives Home Screen apps their own storage
    note: "The app keeps its own favorites, separate from this browser's.",
  },
  "mac-safari": {
    title: "Add Rescue Dogs to your Dock",
    steps: [
      {
        text: (
          <>
            In the menu bar, choose <strong>File</strong> &rarr;{" "}
            <strong>Add to Dock</strong>
          </>
        ),
      },
      { text: <>Click <strong>Add</strong></> },
    ],
  },
};

interface InstallInstructionsProps {
  method: ManualMethod;
  onClose: () => void;
  /** Focus the page's main content on close, when the opener has unmounted. */
  returnFocusToMain?: boolean;
}

/** The steps for browsers that can install the site but have no API for it. */
export default function InstallInstructions({
  method,
  onClose,
  returnFocusToMain = false,
}: InstallInstructionsProps) {
  const guide = GUIDES[method];

  return (
    // Mounted only while open (InstallAppButton loads it on demand)
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* Above the mobile menu drawer (z-70), which can open this */}
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/50" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            const main = document.querySelector("main");
            if (!returnFocusToMain || !main) return;
            event.preventDefault();
            main.setAttribute("tabindex", "-1");
            main.addEventListener("blur", () => main.removeAttribute("tabindex"), {
              once: true,
            });
            main.focus({ preventScroll: true });
          }}
          className="fixed inset-x-0 bottom-0 z-[80] rounded-t-2xl border-t border-line bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl focus:outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border">
          <Dialog.Close
            className="absolute right-4 top-4 rounded-lg p-1.5 text-subtle transition-colors hover:bg-soft hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Dialog.Close>

          <Dialog.Title className="pr-8 font-display text-xl font-bold tracking-tight text-ink">
            {guide.title}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-subtle">
            It opens full screen, straight to the dogs. No app store, no account.
          </Dialog.Description>

          <ol className="mt-5 space-y-3">
            {guide.steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={index} className="flex items-center gap-3 text-ink">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                    {index + 1}
                  </span>
                  <span className="flex-1">{step.text}</span>
                  {Icon && <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-subtle" />}
                </li>
              );
            })}
          </ol>

          {guide.note && <p className="mt-4 text-sm text-subtle">{guide.note}</p>}

          <Dialog.Close className="mt-6 w-full rounded-full bg-orange-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-orange-400 dark:text-gray-950 dark:hover:bg-orange-300">
            Got it
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
