"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Dog } from "lucide-react";
import { cn } from "@/lib/utils";
import { AGE_CATEGORIES, getAgeCategoriesArray } from "@/utils/ageData";

export default function AgeQuickNav({ currentSlug }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const categories = getAgeCategoriesArray();
  const currentCategory = currentSlug ? AGE_CATEGORIES[currentSlug] : null;

  const handleSelect = (slug) => {
    setIsOpen(false);
    if (slug) {
      router.push(`/dogs/${slug}`);
    } else {
      router.push("/dogs");
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
              {currentCategory ? (
                <>
                  <span className="text-lg">{currentCategory.emoji}</span>
                  <span className="font-medium">{currentCategory.name}</span>
                </>
              ) : (
                <>
                  <Dog className="h-5 w-5" />
                  <span className="font-medium">All Dogs</span>
                </>
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
                className="absolute top-full left-0 right-0 mt-1 z-50 bg-background rounded-lg border shadow-lg overflow-hidden"
              >
                <button
                  onClick={() => handleSelect(null)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors border-b",
                    !currentSlug && "bg-orange-50 dark:bg-orange-900/20"
                  )}
                  role="option"
                  aria-selected={!currentSlug}
                >
                  <div className="flex items-center gap-3">
                    <Dog className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">All Dogs</span>
                  </div>
                  {!currentSlug && (
                    <Check className="h-5 w-5 text-orange-500" />
                  )}
                </button>

                {categories.map((category) => {
                  return (
                    <button
                      key={category.slug}
                      onClick={() => handleSelect(category.slug)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors",
                        currentSlug === category.slug &&
                          "bg-orange-50 dark:bg-orange-900/20"
                      )}
                      role="option"
                      aria-selected={currentSlug === category.slug}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{category.emoji}</span>
                        <span className="font-medium">{category.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({category.ageRange})
                        </span>
                      </div>
                      {currentSlug === category.slug && (
                        <Check className="h-5 w-5 text-orange-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Desktop: Horizontal pills */}
        <div className="hidden md:flex items-center justify-center gap-3">
          <Link href="/dogs">
            <div
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                !currentSlug
                  ? "bg-orange-500 text-white shadow-md"
                  : "bg-muted hover:bg-orange-100 dark:hover:bg-orange-900/30 text-foreground"
              )}
            >
              <Dog className="h-4 w-4" />
              <span>All Dogs</span>
            </div>
          </Link>

          {categories.map((category) => {
            const isActive = currentSlug === category.slug;

            return (
              <Link key={category.slug} href={`/dogs/${category.slug}`}>
                <div
                  className={cn(
                    "px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                    isActive
                      ? "bg-orange-500 text-white shadow-md"
                      : "bg-muted hover:bg-orange-100 dark:hover:bg-orange-900/30 text-foreground"
                  )}
                >
                  <span className="text-base">{category.emoji}</span>
                  <span>{category.shortName}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
