"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PawPrint, Search, SlidersHorizontal, Home, X } from "lucide-react";
import { getSuggestions, type SuggestResponse } from "@/services/searchService";
import { trackSearchPerformed, type SearchResultGroup } from "@/lib/analytics";
import { breedHref, catalogBase, filterHref, rescueHref, textSearchHref } from "./searchHrefs";

const DEBOUNCE_MS = 200;

type GroupName = "Popular breeds" | "Breeds" | "Rescues" | "Dogs" | "Filters" | "Search";

interface Option {
  key: string;
  group: GroupName;
  kind: SearchResultGroup;
  href: string;
  label: string;
  /** Second line under the label, e.g. why a synonym matched. */
  note?: string;
  /** Right-aligned detail, e.g. a dog count. */
  meta?: string;
  image?: string | null;
  /** Result count sent to analytics; null where there is none. */
  count: number | null;
}

interface Results {
  query: string;
  data: SuggestResponse | null;
}

interface GlobalSearchProps {
  /** "header" also listens for ⌘K / Ctrl+K and "/" to focus the field. */
  surface: "header" | "mobile";
  className?: string;
}

function dogCount(count: number): string {
  return `${count} ${count === 1 ? "dog" : "dogs"}`;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function buildOptions(results: Results | null, query: string, base: URLSearchParams): Option[] {
  const options: Option[] = [];
  // Popular breeds answer an empty box; once something is typed they only get in the way
  const data = results && (results.query || !query) ? results.data : null;
  const breedGroup: GroupName = results?.query ? "Breeds" : "Popular breeds";
  if (data) {
    data.breeds.forEach((breed) =>
      options.push({
        // Two breed labels can share a slug, so the name keeps keys unique
        key: `breed-${breed.slug}-${breed.name}`,
        group: breedGroup,
        kind: "breed",
        href: breedHref(base, breed.name),
        label: breed.name,
        note: breed.matched_synonym ? `matches “${breed.matched_synonym}”` : undefined,
        meta: dogCount(breed.count),
        count: breed.count,
      }),
    );
    data.rescues.forEach((rescue) =>
      options.push({
        key: `rescue-${rescue.slug}`,
        group: "Rescues",
        kind: "rescue",
        href: rescueHref(base, rescue.id),
        label: rescue.name,
        meta: dogCount(rescue.count),
        count: rescue.count,
      }),
    );
    data.dogs.forEach((dog) =>
      options.push({
        key: `dog-${dog.slug}`,
        group: "Dogs",
        kind: "dog",
        href: `/dogs/${dog.slug}`,
        label: dog.name,
        // Missing data is left out, never shown as "Unknown"
        note: [dog.breed !== "Unknown" && dog.breed, dog.rescue].filter(Boolean).join(" · "),
        image: dog.image,
        count: 1,
      }),
    );
    data.filters.forEach((filter) => {
      const href = filterHref(base, filter.params);
      if (href) {
        options.push({ key: `filter-${filter.label}`, group: "Filters", kind: "filter", href, label: filter.label, count: null });
      }
    });
  }
  if (query) {
    options.push({
      key: "search",
      group: "Search",
      kind: "none",
      href: textSearchHref(base, query),
      label: `Search all dogs for “${query}”`,
      count: null,
    });
    if (results?.query === query && options.length === 1) {
      options.push({ key: "browse", group: "Search", kind: "none", href: "/dogs", label: "Browse all dogs", count: null });
    }
  }
  return options;
}

function OptionIcon({ option }: { option: Option }): React.JSX.Element {
  if (option.kind === "dog") {
    return option.image ? (
      <Image
        src={option.image}
        alt=""
        width={32}
        height={32}
        sizes="32px"
        className="h-8 w-8 shrink-0 rounded-full object-cover bg-muted"
      />
    ) : (
      <span className="h-8 w-8 shrink-0 rounded-full bg-muted" />
    );
  }
  const Icon = { breed: PawPrint, rescue: Home, filter: SlidersHorizontal, none: Search, dog: PawPrint }[option.kind];
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

/** One search box for breeds, rescues, dog names and filter phrases (#492).
 * A combobox: arrows move through the suggestions, Enter opens the chosen one
 * or searches the catalog for the typed text, Escape closes. */
export default function GlobalSearch({ surface, className = "" }: GlobalSearchProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = pathname === "/dogs" ? (searchParams?.get("search") ?? "") : "";

  const [text, setText] = useState(urlSearch);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [shortcut, setShortcut] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const listId = `${id}-list`;
  const optionId = useCallback((index: number): string => `${id}-option-${index}`, [id]);

  // Show the catalog's current text search, and follow it when it changes
  useEffect(() => setText(urlSearch), [urlSearch]);

  const query = text.trim();
  const loadedQuery = results?.query;

  useEffect(() => {
    if (!open || loadedQuery === query) return;
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        getSuggestions(query, controller.signal)
          .then((data) => setResults({ query, data }))
          .catch(() => {
            if (!controller.signal.aborted) setResults({ query, data: null });
          });
      },
      query ? DEBOUNCE_MS : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, loadedQuery]);

  const base = useMemo(() => catalogBase(pathname, searchParams), [pathname, searchParams]);
  const options = useMemo(() => buildOptions(results, query, base), [results, query, base]);

  // A new set of options starts with nothing chosen
  useEffect(() => setActiveIndex(-1), [options]);

  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, optionId]);

  useEffect(() => {
    if (surface !== "header") return;
    setShortcut(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘K" : "Ctrl K");
    const onKeyDown = (event: KeyboardEvent): void => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isShortcut || (event.key === "/" && !isTypingTarget(event.target))) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [surface]);

  const choose = useCallback(
    (option: Option | undefined) => {
      const href = option?.href ?? textSearchHref(base, query);
      trackSearchPerformed(surface, option?.kind ?? "none", option?.count ?? null);
      setOpen(false);
      inputRef.current?.blur();
      if (option && option.kind !== "none") setText("");
      router.push(href);
    },
    [base, query, router, surface],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (!options.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => {
        if (current < 0) return step > 0 ? 0 : options.length - 1;
        return (current + step + options.length) % options.length;
      });
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      } else if (text) {
        event.preventDefault();
        setText("");
      }
    }
  };

  const onSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    choose(activeIndex >= 0 ? options[activeIndex] : undefined);
  };

  const loaded = loadedQuery === query;
  const noMatches = loaded && query !== "" && options.some((option) => option.key === "browse");
  const failed = loaded && results?.data === null;
  const showPanel = open && options.length > 0;

  let lastGroup: GroupName | null = null;

  return (
    <div className={`relative ${className}`}>
      <form role="search" onSubmit={onSubmit}>
        <label htmlFor={`${id}-input`} className="sr-only">
          Search breeds, rescues and dogs
        </label>
        <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 text-muted-foreground transition-colors focus-within:border-ring focus-within:bg-background focus-within:ring-2 focus-within:ring-ring/25">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            id={`${id}-input`}
            type="text"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showPanel && activeIndex >= 0 ? optionId(activeIndex) : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder="Search breeds, rescues or names"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-base text-foreground shadow-none placeholder:text-muted-foreground focus:border-0 focus:outline-none focus:ring-0 sm:text-sm"
          />
          {text ? (
            <button
              type="button"
              aria-label="Clear search"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setText("");
                inputRef.current?.focus();
              }}
              className="grid h-6 w-6 place-items-center rounded-full hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            shortcut && (
              <kbd className="hidden rounded border border-border bg-background px-1.5 font-mono text-[11px] lg:inline">
                {shortcut}
              </kbd>
            )
          )}
        </div>
      </form>

      <div
        hidden={!showPanel}
        // Keep focus in the field while the pointer picks a suggestion
        onMouseDown={(event) => event.preventDefault()}
        className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[min(70vh,32rem)] overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-lg sm:min-w-[24rem]"
      >
        <ul id={listId} role="listbox" aria-label="Search suggestions" className="py-1.5">
          {options.map((option, index) => {
            const heading = option.group !== lastGroup && option.group !== "Search" ? option.group : null;
            const divider = option.group !== lastGroup && lastGroup !== null;
            lastGroup = option.group;
            return (
              <React.Fragment key={option.key}>
                {divider && <li role="presentation" className="my-1.5 border-t border-border" />}
                {heading && (
                  <li role="presentation" className="px-3.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {heading}
                  </li>
                )}
                <li
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => choose(option)}
                  onMouseMove={() => index !== activeIndex && setActiveIndex(index)}
                  className={`flex cursor-pointer items-center gap-2.5 px-3.5 py-1.5 text-sm ${index === activeIndex ? "bg-muted" : ""}`}
                >
                  <OptionIcon option={option} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{option.label}</span>
                    {option.note && <span className="block truncate text-xs text-muted-foreground">{option.note}</span>}
                  </span>
                  {option.meta && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{option.meta}</span>}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
        {(noMatches || failed) && (
          <p className="border-t border-border px-3.5 py-2.5 text-sm text-muted-foreground">
            {failed ? "Suggestions aren't available right now." : `No breeds, rescues or dogs match “${query}”.`}
          </p>
        )}
        {surface === "header" && (
          <p aria-hidden="true" className="hidden gap-3 border-t border-border px-3.5 py-2 text-[11px] text-muted-foreground lg:flex">
            <span><kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd> choose</span>
            <span><kbd className="font-mono">↵</kbd> open</span>
            <span><kbd className="font-mono">esc</kbd> close</span>
          </p>
        )}
      </div>
    </div>
  );
}
