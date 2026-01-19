"use client";

import dynamic from "next/dynamic";

const MobileBottomNav = dynamic(
  () => import("./MobileBottomNav"),
  { ssr: false }
);

export default function MobileBottomNavWrapper() {
  return <MobileBottomNav />;
}
