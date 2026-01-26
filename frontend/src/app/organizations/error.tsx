"use client";

import { RouteErrorBoundary } from "@/components/error/RouteErrorBoundary";

export default function OrganizationsError({
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
      feature="organizations"
      message="We couldn't load the organizations page. Please try again."
    />
  );
}
