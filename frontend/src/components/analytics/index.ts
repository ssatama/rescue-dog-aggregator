"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";

export const Analytics: ComponentType = dynamic(() => import("./Analytics"), {
  ssr: false,
});

export const SpeedInsights: ComponentType = dynamic(
  () => import("./SpeedInsights"),
  {
    ssr: false,
  },
);
