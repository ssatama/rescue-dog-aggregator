"use client";

import { SpeedInsights as VercelSpeedInsights } from "@vercel/speed-insights/next";

export default function SpeedInsights() {
  const isProduction = process.env.NODE_ENV === "production";
  const isVercelEnvironment =
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview";

  if (!isProduction && !isVercelEnvironment) {
    return null;
  }

  return <VercelSpeedInsights />;
}
