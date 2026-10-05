import { useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";

const DEBOUNCE_SCROLL_SAVE_MS = 300;
const RESTORE_DELAY_MS = 100;

/** Where the catalog keeps its scroll position in the history entry's state. */
export const SCROLL_STATE_KEY = "catalogScroll";

/**
 * Where it keeps the index of the dog in the middle of the screen (#684). Far
 * down a virtualized list a pixel offset lands on other dogs, since rows not
 * yet measured are only estimated, so the grid returns to this dog instead.
 */
export const DOG_STATE_KEY = "catalogDog";

export function savedScroll(): number {
  const saved: unknown = window.history.state?.[SCROLL_STATE_KEY];
  return typeof saved === "number" && saved > 0 ? saved : 0;
}

export function savedDogIndex(): number | null {
  const saved: unknown = window.history.state?.[DOG_STATE_KEY];
  return typeof saved === "number" && saved >= 0 ? saved : null;
}

/**
 * Replaces the URL of the current history entry, keeping its saved scroll
 * position and dog. Next.js copies its own state into ours when that has none.
 */
export function replaceUrlKeepingScroll(url: string): void {
  const dog = savedDogIndex();
  window.history.replaceState({ [SCROLL_STATE_KEY]: savedScroll(), ...(dog !== null && { [DOG_STATE_KEY]: dog }) }, "", url);
}

/**
 * Keeps the catalog's scroll position in the history entry, not the URL
 * (#670): back and forward return to it, while a copied or shared link opens
 * at the top. Links from before #670 that carry ?scroll= restore once, and
 * the parameter is dropped from the URL.
 */
export default function useScrollRestoration({
  searchParams,
  pathname,
}: {
  searchParams: URLSearchParams;
  pathname: string;
}): void {
  const saveScrollPosition = useDebouncedCallback(() => {
    window.history.replaceState(
      { ...window.history.state, [SCROLL_STATE_KEY]: Math.round(window.scrollY) },
      "",
    );
  }, DEBOUNCE_SCROLL_SAVE_MS);

  useEffect(() => {
    window.addEventListener("scroll", saveScrollPosition, { passive: true });
    return () => {
      window.removeEventListener("scroll", saveScrollPosition);
      saveScrollPosition.cancel();
    };
  }, [saveScrollPosition]);

  useEffect(() => {
    const legacyScroll = parseInt(searchParams.get("scroll") || "0", 10);
    let target = savedScroll();
    if (legacyScroll > 0) {
      target = legacyScroll;
      const params = new URLSearchParams(searchParams.toString());
      params.delete("scroll");
      window.history.replaceState(
        { [SCROLL_STATE_KEY]: target },
        "",
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
      );
    }
    // The grid returns to a saved dog itself, once the dogs have loaded
    if (target === 0 || savedDogIndex() !== null) return;

    // A save fired by the restore itself would only store the same position
    const timer = setTimeout(() => window.scrollTo(0, target), RESTORE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mount-only: restores the position the page was left at
  }, []);
}
