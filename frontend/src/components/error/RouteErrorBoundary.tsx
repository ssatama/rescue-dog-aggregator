"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Layout from "@/components/layout/Layout";
import WayBack, { PRIMARY_ACTION } from "@/components/ui/WayBack";

type RouteErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
  feature: string;
  message: string;
};

export function RouteErrorBoundary({
  error,
  reset,
  feature,
  message,
}: RouteErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { feature, errorType: "server-component" },
      extra: { digest: error.digest },
    });
  }, [error, feature]);

  // Inside the site's own header and footer, so the page is never a dead end (#503)
  return (
    <Layout>
      <WayBack
        title="Something went wrong"
        message={message}
        action={
          <button type="button" onClick={reset} className={PRIMARY_ACTION}>
            Try again
          </button>
        }
      />
    </Layout>
  );
}
