"use client";

import { useEffect } from "react";

export default function SentryInitializer() {
  useEffect(() => {
    import("@/instrumentation-client");
  }, []);

  return null;
}
