"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

function handleBeforeSend(event) {
  if (typeof window !== "undefined" && localStorage.getItem("va-disable")) {
    return null;
  }
  return event;
}

export default function Analytics() {
  const isProduction = process.env.NODE_ENV === "production";
  const isVercelEnvironment =
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview";

  if (!isProduction && !isVercelEnvironment) {
    return null;
  }

  return <VercelAnalytics beforeSend={handleBeforeSend} />;
}
