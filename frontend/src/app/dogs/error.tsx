"use client";

import { RouteErrorBoundary } from "@/components/error/RouteErrorBoundary";

export default function DogsError({
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
      feature="dogs-catalog"
      message="We couldn't load the dogs catalog. Please try again."
    />
  );
}
