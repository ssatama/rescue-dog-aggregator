"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSwipeNavigation } from "../../../hooks/useSwipeNavigation";
import { NavigationArrows } from "../../../components/dogs/detail";

interface SwipeNavigationOverlayProps {
  dogSlug: string;
}

export default function SwipeNavigationOverlay({ dogSlug }: SwipeNavigationOverlayProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const searchParamsObj = useMemo(() => {
    const paramsObj: Record<string, string> = {};
    if (searchParams) {
      for (const [key, value] of searchParams.entries()) {
        paramsObj[key] = value;
      }
    }
    return paramsObj;
  }, [searchParams]);

  const {
    handlers,
    prevDog,
    nextDog,
    isLoading: navLoading,
  } = useSwipeNavigation({
    currentDogSlug: dogSlug,
    searchParams: searchParamsObj,
  });

  useEffect(() => {
    if (showSwipeHint && (prevDog || nextDog)) {
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [showSwipeHint, prevDog, nextDog]);

  const handlePrevDog = useCallback(() => {
    if (prevDog) {
      const qs = searchParams?.toString() ?? "";
      const url = `/dogs/${prevDog.slug}${qs ? `?${qs}` : ""}`;
      router.push(url);
    }
  }, [prevDog, searchParams, router]);

  const handleNextDog = useCallback(() => {
    if (nextDog) {
      const qs = searchParams?.toString() ?? "";
      const url = `/dogs/${nextDog.slug}${qs ? `?${qs}` : ""}`;
      router.push(url);
    }
  }, [nextDog, searchParams, router]);

  const hasNavigation = prevDog || nextDog;

  return (
    <>
      {/* Swipe touch target - overlays the content area */}
      {hasNavigation && (
        <div
          className="absolute inset-0 z-0"
          {...handlers}
          aria-hidden="true"
        />
      )}

      {/* Swipe hint for mobile */}
      {hasNavigation && (
        <div className="lg:hidden">
          <div
            className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-10 transition-opacity duration-500 ${
              showSwipeHint
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
            role="status"
            aria-live="polite"
            aria-label="Swipe navigation hint"
          >
            <div className="bg-black/50 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
              {prevDog && <span aria-hidden="true">&larr;</span>}
              <span>Swipe to browse</span>
              {nextDog && <span aria-hidden="true">&rarr;</span>}
            </div>
          </div>
        </div>
      )}

      {/* Desktop navigation arrows */}
      <NavigationArrows
        onPrev={handlePrevDog}
        onNext={handleNextDog}
        hasPrev={!!prevDog}
        hasNext={!!nextDog}
        isLoading={navLoading}
      />
    </>
  );
}
