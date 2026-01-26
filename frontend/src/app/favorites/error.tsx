"use client";

import { RouteErrorBoundary } from "@/components/error/RouteErrorBoundary";

export default function FavoritesError({
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
      feature="favorites"
      message="We couldn't load your favorites. Please try again."
    />
  );
}
