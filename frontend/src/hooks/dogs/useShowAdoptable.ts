"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * For a page that embeds the catalog under its own header (breed, rescue and
 * landing pages): "N adoptable to you" turns on the list's own "Only dogs I
 * can adopt" filter, through the URL the catalog reads, and scrolls to the
 * list (the element with id "dogs-grid").
 */
export default function useShowAdoptable(): (countryValue: string) => void {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  return useCallback(
    (countryValue: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("available_country", countryValue);
      params.delete("available_region");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("dogs-grid")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    },
    [router, pathname, searchParams],
  );
}
