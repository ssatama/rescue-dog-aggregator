"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import DogCard from "./DogCard";
import DogCardErrorBoundary from "../error/DogCardErrorBoundary";
import { DOG_GRID } from "@/constants/layout";
import { useGridColumns } from "@/hooks/useGridColumns";
import { useLegacyDogHash } from "@/hooks/useLegacyDogHash";
import type { Dog } from "@/types/dog";

const ROW_HEIGHT = 360; // A first guess; rows are measured once rendered
const OVERSCAN = 2; // Extra rows rendered above and below the screen

function Card({ dog, position }: { dog: Dog; position: number }): React.JSX.Element {
  return (
    <DogCardErrorBoundary dogId={dog.id}>
      <DogCard dog={dog} priority={position < 8} position={position} listContext="search" />
    </DogCardErrorBoundary>
  );
}

function VirtualRows({ dogs, columns }: { dogs: Dog[]; columns: number }): React.JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const gap = columns === 2 ? 12 : 16; // DOG_GRID's gap-3 / sm:gap-4

  const rowVirtualizer = useWindowVirtualizer({
    count: Math.ceil(dogs.length / columns),
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
    gap,
    scrollMargin,
  });

  // Where the list starts on the page, so the right rows count as on screen.
  // Chips, the adoptable switch or an alert above it move it, and each of
  // those changes the page's height, so watch that.
  useLayoutEffect(() => {
    const measure = (): void => {
      if (listRef.current) setScrollMargin(listRef.current.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={listRef}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
        {rowVirtualizer.getVirtualItems().map((row) => {
          const start = row.index * columns;
          return (
            <div
              key={row.key}
              data-index={row.index}
              ref={rowVirtualizer.measureElement}
              className={`absolute w-full ${DOG_GRID}`}
              style={{ transform: `translateY(${row.start - scrollMargin}px)` }}
            >
              {dogs.slice(start, start + columns).map((dog, i) => (
                <Card key={dog.id} dog={dog} position={start + i} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The catalog's dogs: one responsive grid at every width (#496), virtualized
 * by rows once the browser knows how many columns fit. */
export default function CatalogDogGrid({ dogs }: { dogs: Dog[] }): React.JSX.Element {
  const columns = useGridColumns();
  useLegacyDogHash();

  // Server render and hydration: the CSS alone lays out the grid
  if (columns === null) {
    return (
      <div className={DOG_GRID}>
        {dogs.map((dog, i) => (
          <Card key={dog.id} dog={dog} position={i} />
        ))}
      </div>
    );
  }

  return <VirtualRows dogs={dogs} columns={columns} />;
}
