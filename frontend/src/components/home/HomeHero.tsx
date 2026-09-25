import { Suspense } from "react";
import Link from "next/link";
import GlobalSearch from "../search/GlobalSearch";
import { formatCount } from "@/utils/formatCount";

/** One tap into the catalog's most-asked-for lists (#497). */
export const QUICK_CHIPS = [
  { label: "Puppies", href: "/dogs/puppies" },
  { label: "Seniors", href: "/dogs/senior" },
  { label: "Good with children", href: "/dogs?good_with_kids=true" },
  { label: "Good with cats", href: "/dogs?good_with_cats=true" },
  { label: "Small dogs", href: "/dogs?size=Small" },
  { label: "First-time owners", href: "/dogs?first_time_friendly=true" },
] as const;

interface HomeHeroProps {
  totalDogs: number;
  totalRescues: number;
}

export default function HomeHero({ totalDogs, totalRescues }: HomeHeroProps): React.JSX.Element {
  // No invented numbers: this page is cached for hours (#444)
  const scope =
    totalDogs > 0 && totalRescues > 0
      ? `${formatCount(totalDogs)} dogs from ${totalRescues} rescues across Europe and the UK, updated three times a week.`
      : "Dogs from rescues across Europe and the UK, updated three times a week.";

  return (
    <section
      aria-labelledby="home-title"
      data-home-search
      className="-mx-4 -mt-8 bg-gradient-to-b from-orange-50 to-background px-4 pb-5 pt-5 dark:from-orange-950/25 sm:pb-8 sm:pt-10 lg:pb-8 lg:pt-12"
    >
      <div className="mx-auto grid max-w-7xl gap-3 sm:gap-4 sm:px-2 lg:px-4">
        <h1
          id="home-title"
          className="max-w-[16ch] font-display text-[1.75rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]"
        >
          Find a rescue dog you can adopt
        </h1>
        <p className="max-w-2xl text-sm text-subtle sm:text-lg">
          {scope} <span className="whitespace-nowrap">Free, no account, no cookies.</span>
        </p>
        <Suspense fallback={<div className="h-12 max-w-2xl rounded-xl border border-line bg-surface sm:h-14" />}>
          <GlobalSearch surface="home" className="max-w-2xl" />
        </Suspense>
        <nav aria-label="Popular searches" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            {QUICK_CHIPS.map((chip) => (
              <li key={chip.href}>
                <Link
                  href={chip.href}
                  className="inline-flex h-9 items-center whitespace-nowrap rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-ink transition-colors hover:bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {chip.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
