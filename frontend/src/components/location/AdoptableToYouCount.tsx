"use client";

import React from "react";
import { useVisitorLocation } from "@/lib/visitorLocation";
import { catalogCountryValue } from "@/utils/adoptability";
import { getCountryName } from "@/utils/countryNames";
import type { FilterCount } from "@/schemas/common";

/**
 * "N adoptable to you" for the visitor's country (#493), from a breed's or a
 * rescue's per-country counts (#500, #501). Says nothing without a country or
 * a match, like the dog badge: never a "not adoptable" line.
 */
export default function AdoptableToYouCount({
  options,
  onShow,
}: {
  options?: FilterCount[];
  onShow?: (countryValue: string) => void;
}): React.JSX.Element | null {
  const { country } = useVisitorLocation();
  const value = catalogCountryValue((options ?? []).map((option) => String(option.value)), country);
  const count = options?.find((option) => String(option.value) === value)?.count ?? 0;
  if (!value || count === 0) return null;

  const label = (
    <>
      <span aria-hidden="true">✓</span> {count} adoptable to you in {getCountryName(country)}
    </>
  );
  const style = "inline-flex items-center gap-1.5 rounded-full bg-good-soft px-3 py-1 text-sm font-semibold text-good";
  return onShow ? (
    <button type="button" onClick={() => onShow(value)} className={`${style} hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}>
      {label}
    </button>
  ) : (
    <p className={style}>{label}</p>
  );
}
