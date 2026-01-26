"use client";

import { RouteErrorBoundary } from "@/components/error/RouteErrorBoundary";

export default function GuideDetailError({
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
      feature="guide-detail"
      message="We couldn't load this guide. Please try again."
    />
  );
}
