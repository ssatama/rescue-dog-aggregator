"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/react";

export default function Analytics() {
  // Only render analytics in production environments
  const isProduction = process.env.NODE_ENV === "production";
  const isVercelEnvironment =
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview";

  if (!isProduction && !isVercelEnvironment) {
    return null;
  }

  return <VercelAnalytics />;
}
