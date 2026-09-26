"use client";

import { useMemo } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import LandingNav from "@/components/landing/LandingNav";
import AdoptableToYouCount from "@/components/location/AdoptableToYouCount";
import useShowAdoptable from "@/hooks/dogs/useShowAdoptable";
import { getAgeCategoriesArray } from "@/utils/ageData";
import type { AgeLandingClientProps } from "@/types/pageComponents";
import DogsPageClientSimplified from "../DogsPageClientSimplified";

/**
 * /dogs/puppies and /dogs/senior (#502): a short intro, then the catalog
 * itself with the age fixed, so the count, chips, sort and filters are the
 * catalog's own.
 */
export default function AgeLandingClient({
  ageCategory,
  initialDogs,
  metadata,
  totalCount,
  adoptableOptions,
}: AgeLandingClientProps) {
  const showAdoptable = useShowAdoptable();
  const initialParams = useMemo(() => ({ age_category: ageCategory.apiValue }), [ageCategory.apiValue]);
  const navItems = [
    { href: "/dogs", label: "All dogs" },
    ...getAgeCategoriesArray().map((category) => ({
      href: `/dogs/${category.slug}`,
      label: category.shortName,
      current: category.slug === ageCategory.slug,
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl py-6 lg:py-8">
      <Breadcrumbs
        items={[
          { name: "Home", url: "/" },
          { name: "Dogs", url: "/dogs" },
          { name: ageCategory.name },
        ]}
      />

      <header className="grid gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{ageCategory.title}</h1>
        <p className="max-w-2xl text-base text-subtle">{ageCategory.description}.</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {totalCount > 0 && (
            <p className="text-ink">
              <span className="font-display text-2xl font-bold">{totalCount.toLocaleString("en-GB")}</span>{" "}
              <span className="text-subtle">listed · {ageCategory.ageRange.toLowerCase()}</span>
            </p>
          )}
          <AdoptableToYouCount options={adoptableOptions} onShow={showAdoptable} />
        </div>
        <LandingNav label="Browse by age" items={navItems} />
      </header>

      <section id="dogs-grid" aria-label={ageCategory.name} className="scroll-mt-20">
        <DogsPageClientSimplified
          initialDogs={initialDogs}
          metadata={metadata}
          initialParams={initialParams}
          hideHero
          hideBreadcrumbs
        />
      </section>
    </div>
  );
}
