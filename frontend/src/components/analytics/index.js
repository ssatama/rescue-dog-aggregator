"use client";

import dynamic from "next/dynamic";

export const Analytics = dynamic(() => import("./Analytics"), {
  ssr: false,
});

export const SpeedInsights = dynamic(() => import("./SpeedInsights"), {
  ssr: false,
});
