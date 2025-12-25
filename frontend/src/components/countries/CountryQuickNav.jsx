"use client";

import { useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CountryQuickNav({ currentCountry, allCountries }) {
  const scrollRef = useRef(null);

  const countries = useMemo(() => {
    return Object.values(allCountries).filter((c) => c.code);
  }, [allCountries]);

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

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors hidden md:flex"
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
            className="shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors hidden md:flex"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
