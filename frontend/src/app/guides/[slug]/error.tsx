"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GuideDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { feature: "guide-detail", errorType: "server-component" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">
          We couldn&apos;t load this guide. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
