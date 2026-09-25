"use client";

import React, { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { FILTER_DEFAULTS } from "@/constants/filters";
import { setOnlyAdoptable, useVisitorLocation } from "@/lib/visitorLocation";
import { catalogCountryValue } from "@/utils/adoptability";
import { getCountryName, getFlagEmoji } from "@/utils/countryNames";

// The catalog's URL key for "Adoptable to country" (useDogsFilters)
const COUNTRY_URL_KEY = "available_country";

interface OnlyAdoptableSwitchProps {
  /** The catalog's "Adoptable to country" options, as the API spells them. */
  countryOptions: string[];
  /** The catalog's current "Adoptable to country" value. */
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** "Only dogs I can adopt in 🇬🇧" (#493). Off until the visitor turns it on;
 * then remembered, and applied when they come back to a list that has no
 * country filter of its own. Hidden without a country, or where no listed
 * rescue adopts out to it. */
export default function OnlyAdoptableSwitch({
  countryOptions,
  value,
  onChange,
  className,
}: OnlyAdoptableSwitchProps): React.JSX.Element | null {
  const { country, onlyAdoptable } = useVisitorLocation();
  const target = catalogCountryValue(countryOptions, country);
  const applied = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The remembered switch goes into the URL, which the catalog reads its
  // filters from, so it survives the catalog's own start-up fetches
  useEffect(() => {
    if (applied.current || !target || !onlyAdoptable) return;
    applied.current = true;
    if (value !== FILTER_DEFAULTS.COUNTRY) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set(COUNTRY_URL_KEY, target);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [target, onlyAdoptable, value, pathname, router, searchParams]);

  if (!target || !country) return null;
  const checked = value === target;

  const toggle = (): void => {
    setOnlyAdoptable(!checked);
    onChange(checked ? FILTER_DEFAULTS.COUNTRY : target);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full py-1 pr-1 text-sm font-medium text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-ink" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-sm transition-[left]",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      <span>
        Only dogs I can adopt in <span aria-hidden="true">{getFlagEmoji(country)}</span>{" "}
        {getCountryName(country)}
      </span>
    </button>
  );
}
