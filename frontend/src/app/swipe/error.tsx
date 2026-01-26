"use client";

import { RouteErrorBoundary } from "@/components/error/RouteErrorBoundary";

export default function SwipeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      feature="swipe"
      message="We couldn't load the swipe page. Please try again."
    />
  );
}
