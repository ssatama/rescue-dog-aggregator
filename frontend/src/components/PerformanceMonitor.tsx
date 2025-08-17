"use client";

import { useEffect } from "react";
import { initPerformanceMonitoring } from "@/utils/performanceMonitor";
import { usePathname } from "next/navigation";

export default function PerformanceMonitor() {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize performance monitoring on mount
    initPerformanceMonitoring();
  }, []);

  // Track route changes
  useEffect(() => {
    if (window.performance && window.performance.mark) {
      window.performance.mark(`route-change-${pathname}`);
    }
  }, [pathname]);

  return null;
}
