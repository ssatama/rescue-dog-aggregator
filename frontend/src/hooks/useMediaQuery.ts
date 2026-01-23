import { useSyncExternalStore } from "react";

const getServerSnapshot = (): boolean => false;

export function useMediaQuery(query: string): boolean {
  const subscribe = (callback: () => void): (() => void) => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return () => {};
    }
    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addEventListener("change", callback);
    return () => mediaQueryList.removeEventListener("change", callback);
  };

  const getSnapshot = (): boolean => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
