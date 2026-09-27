"use client";

import { useEffect, useMemo, type MutableRefObject } from "react";
import { useSearchParams } from "next/navigation";
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
    navigateToPrev,
    navigateToNext,
    isLoading: navLoading,
  } = useSwipeNavigation({
    currentDogSlug: dogSlug,
    searchParams: searchParamsObj,
  });

  useEffect(() => {
    if (!navigationRef) return;
    navigationRef.current = {
      prev: prevDog ? navigateToPrev : undefined,
      next: nextDog ? navigateToNext : undefined,
    };
    return () => {
      navigationRef.current = {};
    };
  }, [navigationRef, prevDog, nextDog, navigateToPrev, navigateToNext]);

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
        onPrev={navigateToPrev}
        onNext={navigateToNext}
        hasPrev={!!prevDog}
        hasNext={!!nextDog}
        isLoading={navLoading}
      />
    </>
  );
}
