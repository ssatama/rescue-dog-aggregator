"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils";
import { ENERGY_BANDS, FIRST_TIME_FRIENDLY, LIVES_WELL_WITH, type LifestyleFilterKey } from "@/constants/filters";
import type { FilterCountsResponse, LifestyleCount } from "@/schemas/common";
import type { Filters } from "@/types/dogsPage";

export type LifestyleFilterValues = Pick<Filters, LifestyleFilterKey>;
type Counts = NonNullable<FilterCountsResponse["lifestyle"]>;

interface LifestyleFiltersProps {
  values: LifestyleFilterValues;
  onChange: (key: LifestyleFilterKey, value: string) => void;
  counts?: Counts | null;
}

/** How many lifestyle filters are on. */
export function activeLifestyleCount(values: LifestyleFilterValues): number {
  return Object.values(values).filter(Boolean).length;
}

const format = (n: number): string => n.toLocaleString("en-GB");

/** An option is offered while it has matches or is on, so it can be turned off. */
function offered(count: LifestyleCount | undefined, active: boolean): boolean {
  return active || !count || count.count > 0;
}

function Toggle({
  label,
  checked,
  count,
  onToggle,
}: {
  label: string;
  checked: boolean;
  count?: LifestyleCount;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-ink" : "bg-subtle/40")}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-sm transition-[left]",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2 text-sm font-medium text-ink">
          {label}
          {count && <span className="text-xs font-normal tabular-nums text-subtle">{format(count.count)}</span>}
        </span>
        {count && <span className="block text-xs text-subtle">Known for {format(count.known)} dogs</span>}
      </span>
    </button>
  );
}

function Heading({ id, children }: { id: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <h4 id={id} className="text-sm font-semibold uppercase tracking-wider text-ink">
      {children}
    </h4>
  );
}

/** "Lives well with" and "Suits" (#495). Each filter matches only dogs whose
 * profile records a positive answer, so every option says how many dogs have
 * the information at all. */
export default function LifestyleFilters({ values, onChange, counts }: LifestyleFiltersProps): React.JSX.Element | null {
  // The sidebar and the drawer can both be on the page
  const id = useId();
  const toggle = (key: LifestyleFilterKey): void => onChange(key, values[key] ? "" : "true");

  const livesWith = LIVES_WELL_WITH.filter(({ key, count }) => offered(counts?.[count], Boolean(values[key])));
  const firstTime = offered(counts?.[FIRST_TIME_FRIENDLY.count], Boolean(values[FIRST_TIME_FRIENDLY.key]));
  const bands = ENERGY_BANDS.filter(({ value, count }) => offered(counts?.[count], values.energyFilter === value));
  // The bands share one "known": every dog with a recorded energy level
  const energyKnown = counts?.energy_low.known;

  if (livesWith.length === 0 && !firstTime && bands.length === 0) return null;

  return (
    <div className="space-y-6" data-testid="lifestyle-filters">
      {livesWith.length > 0 && (
        <section className="space-y-2" aria-labelledby={`${id}-lives`}>
          <Heading id={`${id}-lives`}>Lives well with</Heading>
          <p className="text-xs text-subtle">Shows only dogs whose rescue says so.</p>
          {livesWith.map(({ key, count, label }) => (
            <Toggle
              key={key}
              label={label}
              checked={Boolean(values[key])}
              count={counts?.[count]}
              onToggle={() => toggle(key)}
            />
          ))}
        </section>
      )}

      {(firstTime || bands.length > 0) && (
        <section className="space-y-2" aria-labelledby={`${id}-suits`}>
          <Heading id={`${id}-suits`}>Suits</Heading>
          {firstTime && (
            <Toggle
              label={FIRST_TIME_FRIENDLY.label}
              checked={Boolean(values[FIRST_TIME_FRIENDLY.key])}
              count={counts?.[FIRST_TIME_FRIENDLY.count]}
              onToggle={() => toggle(FIRST_TIME_FRIENDLY.key)}
            />
          )}
          {bands.length > 0 && (
            <div role="group" aria-labelledby={`${id}-energy`} className="pt-2">
              <p id={`${id}-energy`} className="mb-2 text-sm font-medium text-ink">
                Energy
              </p>
              <div className="grid grid-cols-3 gap-2">
                {bands.map(({ value, label, count }) => {
                  const active = values.energyFilter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      // Pressing the chosen band again turns the filter off
                      onClick={() => onChange("energyFilter", active ? "" : value)}
                      className={cn(
                        "flex min-h-11 flex-col items-center justify-center rounded-lg border px-2 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:bg-soft",
                      )}
                    >
                      {label}
                      {counts && (
                        <span className={cn("text-xs font-normal tabular-nums", active ? "text-surface/80" : "text-subtle")}>
                          {format(counts[count].count)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {energyKnown !== undefined && (
                <p className="mt-1.5 text-xs text-subtle">Known for {format(energyKnown)} dogs</p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
