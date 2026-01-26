"use client";

import { RouteErrorBoundary } from "@/components/error/RouteErrorBoundary";

export default function DogDetailError({
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
      feature="dog-detail"
      message="We couldn't load this dog's profile. Please try again."
    />
  );
}
