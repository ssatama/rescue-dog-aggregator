import { useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";

const DEBOUNCE_SCROLL_SAVE_MS = 300;
const RESTORE_DELAY_MS = 100;

/** Where the catalog keeps its scroll position in the history entry's state. */
export const SCROLL_STATE_KEY = "catalogScroll";

function savedScroll(): number {
  const saved: unknown = window.history.state?.[SCROLL_STATE_KEY];
  return typeof saved === "number" && saved > 0 ? saved : 0;
}

/**
 * Replaces the URL of the current history entry, keeping its saved scroll
 * position. Next.js copies its own state into ours when that has none.
 */
export function replaceUrlKeepingScroll(url: string): void {
  window.history.replaceState({ [SCROLL_STATE_KEY]: savedScroll() }, "", url);
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
    if (target === 0) return;

    // A save fired by the restore itself would only store the same position
    const timer = setTimeout(() => window.scrollTo(0, target), RESTORE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mount-only: restores the position the page was left at
  }, []);
}
