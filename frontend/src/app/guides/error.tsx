"use client";

import { RouteErrorBoundary } from "@/components/error/RouteErrorBoundary";

export default function GuidesError({
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
      feature="guides"
      message="We couldn't load the guides page. Please try again."
    />
  );
}
