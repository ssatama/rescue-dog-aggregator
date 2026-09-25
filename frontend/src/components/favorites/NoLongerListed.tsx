import React from "react";
import Link from "next/link";
import type { Dog } from "@/types/dog";

/** Where a saved dog's replacements can be found: the catalog, narrowed to its
 * breed and, when the visitor's country is known, to dogs adoptable there. */
export interface SimilarLink {
  count: number;
  href: string;
}

/** Listed means the rescue still shows the dog. The API keeps the rest, marked
 * inactive; a dog it no longer returns at all has no status to read. */
export function isListed(dog: Dog): boolean {
  return dog.active !== false && (dog.status ?? "available") === "available";
}

/** The breed a "similar dogs" link can search for; none for mixes and unknowns. */
export function similarBreed(dog: Dog): string | null {
  const breed = dog.primary_breed?.trim();
  return breed && breed !== "Mixed Breed" && breed !== "Unknown" ? breed : null;
}

function possessive(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

function formatDay(iso: string | undefined, now: Date): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  });
}

/**
 * The note on a saved dog that is no longer listed (#498). We can't know why a
 * dog left a rescue's site, so it never says adopted.
 */
export default function NoLongerListed({
  dog,
  similar,
  adoptable,
  now = new Date(),
}: {
  dog: Dog;
  similar?: SimilarLink | null;
  /** Whether `similar` is narrowed to the visitor's country. */
  adoptable?: boolean;
  now?: Date;
}): React.ReactElement {
  const rescue = dog.organization?.name;
  const since = formatDay(dog.last_seen_at, now);
  const breed = similarBreed(dog);

  return (
    <>
      <p className="mt-0.5 text-sm text-subtle">
        No longer listed on {rescue ? possessive(rescue) : "its rescue's"} site{since ? ` since ${since}` : ""}.
      </p>
      {similar && breed && similar.count > 0 && (
        <Link
          href={similar.href}
          className="relative z-[2] mt-1 inline-block text-sm font-semibold text-orange-700 underline-offset-4 hover:underline dark:text-orange-400"
        >
          See {similar.count} similar {breed}
          {similar.count === 1 || breed.endsWith("s") ? "" : "s"}
          {adoptable ? " you can adopt" : ""} →
        </Link>
      )}
    </>
  );
}
