"use client";

import { RouteErrorBoundary } from "@/components/error/RouteErrorBoundary";

export default function BreedDetailError({
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
      feature="breed-detail"
      message="We couldn't load this breed page. Please try again."
    />
  );
}
