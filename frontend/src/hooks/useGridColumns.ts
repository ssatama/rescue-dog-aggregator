import { useSyncExternalStore } from "react";
import { DOG_GRID_BREAKPOINTS, DOG_GRID_MIN_COLUMNS } from "@/constants/layout";

function subscribe(onChange: () => void): () => void {
  const lists = DOG_GRID_BREAKPOINTS.map(([query]) => window.matchMedia(query));
  lists.forEach((list) => list.addEventListener("change", onChange));
  return () => lists.forEach((list) => list.removeEventListener("change", onChange));
}

function columnsNow(): number {
  return DOG_GRID_BREAKPOINTS.find(([query]) => window.matchMedia(query).matches)?.[1] ?? DOG_GRID_MIN_COLUMNS;
}

/** How many columns DOG_GRID shows right now; null during server render and
 * hydration, when only the CSS knows. */
export function useGridColumns(): number | null {
  return useSyncExternalStore(subscribe, columnsNow, () => null);
}
