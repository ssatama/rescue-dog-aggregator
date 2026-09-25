"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { IMAGE_SIZES } from "@/constants/imageSizes";
import { useVisitorLocation } from "@/lib/visitorLocation";
import { isAdoptableTo } from "@/utils/adoptability";
import { getCountryName } from "@/utils/countryNames";
import { countriesPhrase, rescueReach } from "@/utils/rescueReach";
import RescueLogo from "./RescueLogo";
import type { OrganizationCardData } from "@/types/organizationComponents";

const STRIP_SIZE = 3;

/**
 * A rescue on the index (#501): who and where, a strip of their dogs, how
 * many are listed and whether they rehome to the visitor, and one action.
 * The whole card opens the rescue's page.
 */
export default function RescueCard({ organization }: { organization: OrganizationCardData }): React.JSX.Element {
  const { country } = useVisitorLocation();
  const { name } = organization;
  const href = `/organizations/${organization.slug ?? organization.id}`;
  const totalDogs = organization.total_dogs ?? 0;
  const newThisWeek = organization.new_this_week ?? 0;
  const { basedIn, rehomesTo } = rescueReach(organization);
  const strip = (organization.recent_dogs ?? [])
    .map((dog) => ({ id: dog.id, name: dog.name, src: dog.thumbnail_url || dog.primary_image_url }))
    .filter((dog): dog is typeof dog & { src: string } => Boolean(dog.src))
    .slice(0, STRIP_SIZE);
  // A rescue's dogs all rehome to the same places, so this is true of each of them
  const adoptable = isAdoptableTo({ organization: { ships_to: organization.ships_to ?? [] } }, country);

  return (
    <article
      className="group relative flex h-full flex-col gap-4 rounded-xl border border-line bg-surface p-4 transition-shadow hover:shadow-card focus-within:ring-2 focus-within:ring-ring"
      data-testid="rescue-card"
    >
      <div className="flex items-center gap-3">
        <RescueLogo name={name} logoUrl={organization.logo_url} className="h-12 w-12" />
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold leading-tight text-ink">
            {/* The ::after covers the card, so the whole card is one tap target */}
            <Link
              href={href}
              className="after:absolute after:inset-0 after:z-[1] after:content-[''] focus:outline-none"
            >
              {name}
            </Link>
          </h2>
          {basedIn && <p className="truncate text-sm text-subtle">{basedIn}</p>}
        </div>
      </div>

      {strip.length > 0 && (
        <ul className="grid grid-cols-3 gap-2" aria-label={`Some of ${name}'s dogs`}>
          {strip.map((dog) => (
            <li key={dog.id} className="relative aspect-square overflow-hidden rounded-lg bg-soft">
              <Image
                src={dog.src}
                alt={dog.name}
                fill
                sizes={IMAGE_SIZES.THUMBNAIL}
                className="object-cover object-[center_30%]"
              />
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-1.5 text-sm">
        <p className="text-ink">
          <span className="font-display text-lg font-bold">{totalDogs.toLocaleString("en-GB")}</span>{" "}
          {totalDogs === 1 ? "dog" : "dogs"} listed
          {newThisWeek > 0 && <span className="text-subtle"> · {newThisWeek} new this week</span>}
        </p>
        {rehomesTo.length > 0 && <p className="text-subtle">Rehomes to {countriesPhrase(rehomesTo)}</p>}
        {adoptable && totalDogs > 0 && (
          <p className="inline-flex w-fit items-center gap-1 rounded-full bg-good-soft px-2 py-0.5 text-xs font-semibold text-good">
            <span aria-hidden="true">✓</span> Adoptable to you
            <span className="sr-only"> in {getCountryName(country)}</span>
          </p>
        )}
      </div>

      {/* The card's link is the name's; this only shows where the card goes */}
      <span
        aria-hidden="true"
        className="mt-auto inline-flex h-11 items-center justify-center rounded-lg bg-orange-700 px-4 text-sm font-semibold text-white transition-colors group-hover:bg-orange-800"
      >
        See their dogs
      </span>
    </article>
  );
}
