import { useRef, useEffect, type MutableRefObject } from "react";
import { useDebouncedCallback, type DebouncedState } from "use-debounce";

const DEBOUNCE_SCROLL_SAVE_MS = 300;

interface UseScrollRestorationParams {
  searchParams: URLSearchParams;
  pathname: string;
}

interface UseScrollRestorationReturn {
  scrollPositionRef: MutableRefObject<number>;
  saveScrollPosition: DebouncedState<() => void>;
}

export default function useScrollRestoration({
  searchParams,
  pathname,
}: UseScrollRestorationParams): UseScrollRestorationReturn {
  const rawUrlScroll = parseInt(searchParams.get("scroll") || "0", 10);
  const urlScroll = Number.isNaN(rawUrlScroll) ? 0 : rawUrlScroll;
  const scrollPositionRef = useRef(urlScroll);
  const isRestoringScroll = useRef(false);

  const saveScrollPosition = useDebouncedCallback(() => {
    if (isRestoringScroll.current) return;
    const currentScroll = window.scrollY;
    scrollPositionRef.current = currentScroll;

    const params = new URLSearchParams(searchParams.toString());
    if (currentScroll > 0) {
      params.set("scroll", currentScroll.toString());
    } else {
      params.delete("scroll");
    }

    const newURL = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;

    window.history.replaceState(null, "", newURL);
  }, DEBOUNCE_SCROLL_SAVE_MS);

  useEffect(() => {
    const handleScroll = () => {
      saveScrollPosition();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [saveScrollPosition]);

  useEffect(() => {
    if (urlScroll > 0) {
      isRestoringScroll.current = true;
      const timer = setTimeout(() => {
        window.scrollTo(0, urlScroll);
        isRestoringScroll.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mount-only: urlScroll is captured at mount time intentionally
  }, []);

  useEffect(() => {
    return () => {
      saveScrollPosition?.cancel?.();
    };
  }, [saveScrollPosition]);

  return { scrollPositionRef, saveScrollPosition };
}
