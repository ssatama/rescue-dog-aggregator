"use client";

import { RouteErrorBoundary } from "@/components/error/RouteErrorBoundary";

export default function BreedsError({
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
      feature="breeds"
      message="We couldn't load the breeds page. Please try again."
    />
  );
}
