"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { usePathname } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import DogCard from "./DogCard";
import DogCardErrorBoundary from "../error/DogCardErrorBoundary";
import { DOG_GRID } from "@/constants/layout";
import { useGridColumns } from "@/hooks/useGridColumns";
import { useLegacyDogHash } from "@/hooks/useLegacyDogHash";
import { DOG_STATE_KEY, savedDogIndex, savedScroll } from "@/hooks/dogs/useScrollRestoration";
import type { Dog } from "@/types/dog";
import type { ListContext } from "@/types/dogComponents";

const ROW_HEIGHT = 360; // A first guess; rows are measured once rendered
const OVERSCAN = 2; // Extra rows rendered above and below the screen
const DEBOUNCE_DOG_SAVE_MS = 300;

function Card({ dog, position, listContext }: { dog: Dog; position: number; listContext: ListContext }): React.JSX.Element {
  return (
    <DogCardErrorBoundary dogId={dog.id}>
      <DogCard dog={dog} priority={position < 8} position={position} listContext={listContext} />
    </DogCardErrorBoundary>
  );
}

function VirtualRows({ dogs, columns, listContext }: { dogs: Dog[]; columns: number; listContext: ListContext }): React.JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState<number | null>(null);
  const pathname = usePathname();
  // On back and forward the browser has switched to this entry's URL and
  // state before this render. On a client navigation Next.js switches them
  // after it, so the state is still the last page's: not a place to return to.
  const [{ ownEntry, returnTo }] = useState(() => {
    const ownEntry = window.location.pathname === pathname;
    return { ownEntry, returnTo: ownEntry ? savedDogIndex() : null };
  });
  const gap = columns === 2 ? 12 : 16; // DOG_GRID's gap-3 / sm:gap-4

  const rowVirtualizer = useWindowVirtualizer({
    count: Math.ceil(dogs.length / columns),
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
    gap,
    scrollMargin: scrollMargin ?? 0,
    // The virtualizer scrolls the window here when it starts: where the
    // window is (after hydration, or a remount on the same page), except
    // after a client navigation, where that's the last page's position (#684).
    initialOffset: () => (ownEntry ? window.scrollY : 0),
  });

  // Back to the dog that was in the middle of the screen, once the list's
  // place on the page is known. scrollToIndex keeps it there while the rows
  // around it are measured.
  const restored = useRef(false);
  useEffect(() => {
    if (scrollMargin === null || restored.current) return;
    restored.current = true;
    if (returnTo === null) return;
    if (returnTo < dogs.length) {
      rowVirtualizer.scrollToIndex(Math.floor(returnTo / columns), { align: "center" });
    } else {
      window.scrollTo(0, savedScroll()); // The list came back shorter
    }
  }, [scrollMargin, returnTo, dogs.length, columns, rowVirtualizer]);

  // Save that dog as the page scrolls. Near the top of the list a pixel
  // offset is exact, so useScrollRestoration's is used there instead.
  const saveDog = useDebouncedCallback(() => {
    const middle = window.scrollY + window.innerHeight / 2;
    const items = rowVirtualizer.getVirtualItems();
    // Below the last row (Load more and the footer fill the screen), the last row
    const row = items.find((item) => item.end >= middle) ?? items.at(-1);
    const { [DOG_STATE_KEY]: _previous, ...state } = window.history.state ?? {};
    const pastListTop = window.scrollY > (scrollMargin ?? 0);
    window.history.replaceState(row && pastListTop ? { ...state, [DOG_STATE_KEY]: row.index * columns } : state, "");
  }, DEBOUNCE_DOG_SAVE_MS);

  useEffect(() => {
    window.addEventListener("scroll", saveDog, { passive: true });
    return () => {
      window.removeEventListener("scroll", saveDog);
      saveDog.cancel();
    };
  }, [saveDog]);

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
              style={{ transform: `translateY(${row.start - (scrollMargin ?? 0)}px)` }}
            >
              {dogs.slice(start, start + columns).map((dog, i) => (
                <Card key={dog.id} dog={dog} position={start + i} listContext={listContext} />
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
/** `listContext` tells analytics which page the cards are on */
export default function CatalogDogGrid({
  dogs,
  listContext = "search",
}: {
  dogs: Dog[];
  listContext?: ListContext;
}): React.JSX.Element {
  const columns = useGridColumns();
  useLegacyDogHash();

  // Server render and hydration: the CSS alone lays out the grid
  if (columns === null) {
    return (
      <div className={DOG_GRID}>
        {dogs.map((dog, i) => (
          <Card key={dog.id} dog={dog} position={i} listContext={listContext} />
        ))}
      </div>
    );
  }

  return <VirtualRows dogs={dogs} columns={columns} listContext={listContext} />;
}
