"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import DogCard from "../dogs/DogCard";
import DogCardErrorBoundary from "../error/DogCardErrorBoundary";
import { DOG_GRID, HOME_ROW_DOGS } from "@/constants/layout";
import type { Dog } from "@/types/dog";


interface HomeDogRowProps {
  id: string;
  title: string;
  /** Muted line beside the title, e.g. how many dogs the row stands for. */
  meta?: string | null;
  href: string;
  linkLabel: string;
  dogs: Dog[];
  /** Load the first photos eagerly: only for the row on the first screen. */
  priority?: boolean;
}

export default function HomeDogRow({
  id,
  title,
  meta,
  href,
  linkLabel,
  dogs,
  priority = false,
}: HomeDogRowProps): React.JSX.Element | null {
  if (dogs.length === 0) return null;
  return (
    <section aria-labelledby={id} className="grid gap-3 sm:gap-4">
      <div className="flex items-end gap-3">
        <div className="min-w-0 sm:flex sm:items-baseline sm:gap-3">
          <h2 id={id} className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {title}
          </h2>
          {meta && <p className="text-sm text-subtle">{meta}</p>}
        </div>
        <Link
          href={href}
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md text-sm font-semibold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      {/* At 3 columns the last two cards are hidden so the row ends square */}
      <div className={`${DOG_GRID} sm:max-xl:[&>*:nth-child(n+7)]:hidden`}>
        {dogs.slice(0, HOME_ROW_DOGS).map((dog, index) => (
          <DogCardErrorBoundary key={dog.id} dogId={dog.id}>
            <DogCard dog={dog} priority={priority && index < 4} position={index} listContext="home" />
          </DogCardErrorBoundary>
        ))}
      </div>
    </section>
  );
}
