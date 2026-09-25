"use client";

import { useEffect, useCallback, useMemo, type MutableRefObject } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSwipeNavigation } from "../../../hooks/useSwipeNavigation";
import { NavigationArrows } from "../../../components/dogs/detail";

export interface DogNavigation {
  prev?: () => void;
  next?: () => void;
}

interface SwipeNavigationOverlayProps {
  dogSlug: string;
  /** Swipe on the photo to change dog. Off when the photo is a gallery, whose
   * own swipe changes photo. */
  gestures?: boolean;
  /** Filled with prev/next dog, so a gallery can change dog when swiped past
   * its first or last photo. A ref rather than a render prop: this overlay
   * sits in a Suspense boundary the gallery must stay out of. */
  navigationRef?: MutableRefObject<DogNavigation>;
}

export default function SwipeNavigationOverlay({
  dogSlug,
  gestures = true,
  navigationRef,
}: SwipeNavigationOverlayProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

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

  useEffect(() => {
    if (!navigationRef) return;
    navigationRef.current = {
      prev: prevDog ? handlePrevDog : undefined,
      next: nextDog ? handleNextDog : undefined,
    };
    return () => {
      navigationRef.current = {};
    };
  }, [navigationRef, prevDog, nextDog, handlePrevDog, handleNextDog]);

  const hasNavigation = prevDog || nextDog;
  const swipeable = gestures && hasNavigation;

  return (
    <>
      {/* Above the gallery's full-screen button, or the button would swallow
          the swipe. Only on devices with a touch pointer (including touch
          laptops), so a mouse-only device can still click a single photo open;
          with touch, that tap is given up for swipe-to-next-dog. */}
      {swipeable && (
        <div
          className="absolute inset-0 z-[2] hidden [@media(any-pointer:coarse)]:block"
          {...handlers}
          aria-hidden="true"
        />
      )}

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
