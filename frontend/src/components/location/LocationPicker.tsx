"use client";

import React from "react";
import { Check, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { COUNTRY_NAMES, getCountryName, getFlagEmoji } from "@/utils/countryNames";
import { ANYWHERE, setVisitorCountry, useVisitorLocation } from "@/lib/visitorLocation";

const COUNTRIES = Object.entries(COUNTRY_NAMES).sort(([, a], [, b]) => a.localeCompare(b));

/** "🇬🇧 I live in the UK" in the header (#493): where the visitor lives, for
 * the "Adoptable to you" labels. Defaults from the connection; the choice
 * stays in this browser. */
export default function LocationPicker({ className = "" }: { className?: string }): React.JSX.Element {
  const { country, choice } = useVisitorLocation();
  const name = country ? getCountryName(country) : null;
  const selected = choice ?? country;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={name ? `I live in ${name}. Change country` : "Choose where you live"}
        className={`flex h-9 items-center gap-1.5 rounded-md px-2 text-small font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      >
        {country ? (
          <span aria-hidden="true" className="text-base leading-none">
            {getFlagEmoji(country)}
          </span>
        ) : (
          <Globe className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="hidden xl:inline">{name ? `I live in ${name}` : "Where do you live?"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[min(70vh,28rem)] w-60 overflow-y-auto">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Marks the dogs you can adopt. Kept in this browser only.
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => setVisitorCountry(ANYWHERE)} className="gap-2">
          <Globe className="h-4 w-4" aria-hidden="true" />
          <span className="flex-1">Anywhere</span>
          {selected === ANYWHERE && <Check className="h-4 w-4" aria-label="selected" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {COUNTRIES.map(([code, countryName]) => (
          <DropdownMenuItem key={code} onSelect={() => setVisitorCountry(code)} className="gap-2">
            <span aria-hidden="true">{getFlagEmoji(code)}</span>
            <span className="flex-1">{countryName}</span>
            {selected === code && <Check className="h-4 w-4" aria-label="selected" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
