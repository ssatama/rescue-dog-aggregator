"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { BreedGroupsSectionProps } from "@/types/breeds";

const INITIAL_GROUPS = 4;

export default function BreedGroupsSection({ breedGroups }: BreedGroupsSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  if (!breedGroups || breedGroups.length === 0) {
    return null;
  }

  const displayGroups = showAll ? breedGroups : breedGroups.slice(0, INITIAL_GROUPS);

  const toggleGroup = (groupName: string): void => {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  return (
    <section id="breed-groups" className="py-8" aria-labelledby="breed-groups-heading">
      <h2 id="breed-groups-heading" className="mb-4 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
        Breed groups
      </h2>

      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {displayGroups.map((group) => {
          const isOpen = openGroups.has(group.name);
          const shortName = group.name.replace(" Group", "");
          const panelId = `breed-group-panel-${shortName.toLowerCase().replace(/\s+/g, "-")}`;

          return (
            <div key={group.name} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <button
                type="button"
                data-testid={`breed-group-${group.name.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => toggleGroup(group.name)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-soft text-2xl" aria-hidden="true">
                  {group.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-bold text-ink">{group.name}</span>
                  <span className="block text-sm text-subtle">{group.description}</span>
                  <span className="mt-1 block text-sm font-semibold text-ink">{group.count} dogs</span>
                </span>
                <ChevronDown
                  className={`mt-1 h-5 w-5 shrink-0 text-subtle transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {/* Always rendered so crawlers see the links (#438) */}
              <div id={panelId} hidden={!isOpen} className="border-t border-line p-2">
                {group.top_breeds && group.top_breeds.length > 0 ? (
                  group.top_breeds.map((breed) => (
                    <Link
                      key={breed.slug}
                      href={`/breeds/${breed.slug}`}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-ink hover:bg-soft"
                    >
                      <span className="flex items-center gap-3">
                        {breed.image_url ? (
                          <span className="relative h-9 w-9 overflow-hidden rounded-full bg-soft">
                            <Image src={breed.image_url} alt="" fill className="object-cover" sizes="36px" />
                          </span>
                        ) : (
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-soft text-xs" aria-hidden="true">
                            🐾
                          </span>
                        )}
                        <span className="text-sm font-medium">{breed.name}</span>
                      </span>
                      <span className="text-sm text-subtle">{breed.count} dogs</span>
                    </Link>
                  ))
                ) : (
                  <Link
                    href={`/dogs?breed_group=${encodeURIComponent(shortName)}`}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-xl text-sm font-semibold text-orange-700 hover:bg-soft dark:text-orange-400"
                  >
                    Browse all {group.count} {shortName} dogs
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {breedGroups.length > INITIAL_GROUPS && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mx-auto mt-4 flex h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink hover:bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {showAll ? "Show fewer groups" : `Show all ${breedGroups.length} groups`}
          <ChevronDown className={`h-4 w-4 ${showAll ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
