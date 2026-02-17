"use client";

import type { BeforeSendEvent } from "@vercel/analytics";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { safeStorage } from "@/utils/safeStorage";

function handleBeforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  if (typeof window !== "undefined" && safeStorage.get("va-disable")) {
    return null;
  }
  return event;
}

export default function Analytics(): React.ReactElement | null {
  const isProduction = process.env.NODE_ENV === "production";
  const isVercelEnvironment =
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview";

  if (!isProduction && !isVercelEnvironment) {
    return null;
  }

  return <VercelAnalytics beforeSend={handleBeforeSend} />;
}
