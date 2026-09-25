"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import DogCard from "./DogCard";
import { getSimilarDogs } from "../../services/similarDogsService";
import { similarDogsQuery } from "../../utils/dogFacts";
import { reportError } from "../../utils/logger";
import { useScrollAnimation } from "../../hooks/useScrollAnimation";
import type { Dog } from "@/types/dog";
import type { SimilarDogsSectionProps } from "@/types/dogComponents";

/**
 * Dogs of the same size and age group, from any rescue (#489). Server-provided
 * dogs render straight into the HTML; otherwise they are fetched on scroll. Like
 * every section on the page, it hides itself when there is nothing to show.
 */
export default function SimilarDogsSection({
  dog,
  initialDogs,
}: SimilarDogsSectionProps): React.ReactElement | null {
  const [dogs, setDogs] = useState<Dog[] | null>(initialDogs ?? null);
  const [sectionRef, isVisible] = useScrollAnimation({
    threshold: 0.1,
    rootMargin: "200px",
    triggerOnce: true,
  });
  const searchable = similarDogsQuery(dog) !== null;

  useEffect(() => {
    if (!isVisible || dogs !== null || !searchable) return;
    let cancelled = false;
    getSimilarDogs(dog)
      .then((found) => !cancelled && setDogs(found))
      .catch((err) => {
        reportError(err, { context: "SimilarDogsSection", dogId: dog.id });
        if (!cancelled) setDogs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isVisible, dogs, searchable, dog]);

  if (!searchable || dogs?.length === 0) return null;

  const rescue = dog.organization;

  return (
    <section ref={sectionRef} aria-labelledby="similar-dogs-heading" data-testid="similar-dogs-section">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="similar-dogs-heading" className="font-display text-2xl font-semibold text-ink">
          Similar dogs
        </h2>
        {rescue?.slug && rescue.name && (
          // The rescue's page, not /dogs?organization_id=…, which robots.txt disallows
          <Link
            href={`/organizations/${rescue.slug}`}
            className="text-sm font-medium text-subtle underline-offset-4 hover:text-ink hover:underline"
          >
            More from {rescue.name} →
          </Link>
        )}
      </div>

      {dogs === null ? (
        <div data-testid="similar-dogs-loading" className="grid grid-cols-1 gap-6 md:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-soft" />
          ))}
        </div>
      ) : (
        <div data-testid="similar-dogs-grid" className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {dogs.map((similar, i) => (
            <DogCard key={similar.id} dog={similar} position={i} listContext="similar" />
          ))}
        </div>
      )}
    </section>
  );
}
