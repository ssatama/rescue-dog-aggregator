import React from "react";
import { favoritesInCommon } from "@/utils/favoritesInCommon";
import type { Dog } from "@/types/dog";

/** Below the list (#498): only what holds for every saved dog. */
export default function FavoritesInsights({ dogs }: { dogs: Dog[] }): React.ReactElement | null {
  const lines = favoritesInCommon(dogs);
  if (lines.length === 0) return null;

  return (
    <section aria-labelledby="favorites-in-common" data-testid="insights-container" className="rounded-xl border border-line bg-surface p-4">
      <h2 id="favorites-in-common" className="font-display text-lg font-bold text-ink">
        What your {dogs.length} dogs have in common
      </h2>
      <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm text-ink sm:grid-cols-2">
        {lines.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden="true" className="text-good">
              ✓
            </span>
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
