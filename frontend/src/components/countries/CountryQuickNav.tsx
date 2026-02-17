"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CountryQuickNavProps } from "@/types/pageComponents";

export default function CountryQuickNav({ currentCountry, allCountries }: CountryQuickNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const countries = useMemo(() => {
    return Object.values(allCountries).filter((c) => c.code);
  }, [allCountries]);

  const currentCountryData = useMemo(() => {
    return countries.find((c) => c.code === currentCountry);
  }, [countries, currentCountry]);

  useEffect(() => {
    const activeEl = scrollRef.current?.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [currentCountry]);

  const scroll = (direction: "left" | "right"): void => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleCountrySelect = (countryCode: string | null): void => {
    setIsOpen(false);
    if (countryCode) {
      router.push(`/dogs/country/${countryCode.toLowerCase()}`);
    } else {
      router.push("/dogs/country");
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4 py-3">
        {/* Mobile: Dropdown selector */}
        <div className="md:hidden relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          >
            <div className="flex items-center gap-2">
              {currentCountryData ? (
                <>
                  <span className="text-lg">{currentCountryData.flag}</span>
                  <span className="font-medium">{currentCountryData.name}</span>
                </>
              ) : (
                <span className="font-medium">All Countries</span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </button>

          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <div
                role="listbox"
                className="absolute top-full left-0 right-0 mt-1 z-50 bg-background rounded-lg border shadow-lg max-h-[60vh] overflow-y-auto"
              >
                <button
                  onClick={() => handleCountrySelect(null)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors border-b",
                    !currentCountry && "bg-orange-50 dark:bg-orange-900/20"
                  )}
                  role="option"
                  aria-selected={!currentCountry}
                >
                  <span className="font-medium">All Countries</span>
                  {!currentCountry && (
                    <Check className="h-5 w-5 text-orange-500" />
                  )}
                </button>

                {countries.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => handleCountrySelect(country.code)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors",
                      currentCountry === country.code &&
                        "bg-orange-50 dark:bg-orange-900/20"
                    )}
                    role="option"
                    aria-selected={currentCountry === country.code}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{country.flag}</span>
                      <span className="font-medium">{country.name}</span>
                    </div>
                    {currentCountry === country.code && (
                      <Check className="h-5 w-5 text-orange-500" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Desktop: Horizontal pills */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
          >
            <Link href="/dogs/country">
              <div
                className={cn(
                  "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  !currentCountry
                    ? "bg-orange-500 text-white"
                    : "bg-muted hover:bg-orange-100 dark:hover:bg-orange-900/30 text-foreground"
                )}
              >
                All Countries
              </div>
            </Link>

            {countries.map((country) => (
              <Link
                key={country.code}
                href={`/dogs/country/${country.code.toLowerCase()}`}
              >
                <div
                  data-active={currentCountry === country.code}
                  className={cn(
                    "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                    currentCountry === country.code
                      ? "bg-orange-500 text-white shadow-md"
                      : "bg-muted hover:bg-orange-100 dark:hover:bg-orange-900/30 text-foreground"
                  )}
                >
                  <span>{country.flag}</span>
                  <span>{country.shortName}</span>
                </div>
              </Link>
            ))}
          </div>

          <button
            onClick={() => scroll("right")}
            className="shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
