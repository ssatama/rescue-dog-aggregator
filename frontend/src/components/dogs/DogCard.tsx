"use client";

import React, { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import { isPlainLeftClick } from "@/utils/linkClick";
import { getCountryName } from "@/utils/countryNames";
import { formatBreed, getAgeCategory } from "@/utils/dogHelpers";
import { IMAGE_SIZES } from "@/constants/imageSizes";
import { trackDogCardClick, trackFavoriteToggle } from "@/lib/monitoring/breadcrumbs";
import { trackDogCardClicked } from "@/lib/analytics";
import { companionAnswer } from "@/utils/dogFacts";
import AdoptableBadge from "@/components/location/AdoptableBadge";
import type { Dog } from "@/types/dog";
import type { ListContext } from "@/types/dogComponents";

export type DogCardSize = "grid" | "compact";

export interface DogCardProps {
  dog: Dog;
  /** `grid` is the photo-on-top card; `compact` is a row with a small photo. */
  size?: DogCardSize;
  priority?: boolean;
  position?: number;
  listContext?: ListContext;
  /** Called on a plain click instead of following the link (the mobile
   * catalog opens its modal). New-tab and modified clicks still follow it. */
  onOpen?: (dog: Dog) => void;
  /** Compact only: buttons beside the text, or in a full-width row below on phones. */
  actions?: React.ReactNode;
  /** Compact only: replaces the facts and greys the row, for a saved dog that
   * is no longer listed (#498). */
  notice?: React.ReactNode;
}

type Fact = { label: string; good: boolean };

const LIVES_WITH: { field: "good_with_children" | "good_with_dogs" | "good_with_cats"; label: string }[] = [
  { field: "good_with_children", label: "Children" },
  { field: "good_with_dogs", label: "Dogs" },
  { field: "good_with_cats", label: "Cats" },
];

/** Up to two known "lives with" facts, good ones first. Unknown and "maybe"
 * are left out: a card never shows missing data. */
export function getLivesWithFacts(dog: Dog, limit = 2): Fact[] {
  const known: Fact[] = [];
  for (const { field, label } of LIVES_WITH) {
    const answer = companionAnswer(dog, field);
    if (answer === "yes") known.push({ label, good: true });
    if (answer === "no") known.push({ label, good: false });
  }
  return known.sort((a, b) => Number(b.good) - Number(a.good)).slice(0, limit);
}

/** "Breed · Age · Sex", leaving out whatever is unknown. */
export function getDogSummary(dog: Dog): string {
  const age = getAgeCategory(dog);
  const sex = dog.sex?.toLowerCase();
  return [
    formatBreed(dog),
    age !== "Unknown" ? age : null,
    sex === "male" || sex === "m" ? "Male" : sex === "female" || sex === "f" ? "Female" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** "Rescue · Country", leaving out whatever is unknown. */
export function getWhere(dog: Dog): string | null {
  const org = dog.organization;
  const country = org?.country ? getCountryName(org.country) : null;
  return [org?.name, country].filter(Boolean).join(" · ") || null;
}

// A photo close to the 4:3 frame fills it. Anything taller, wider or smaller
// than the frame is shown whole over a blurred copy of itself, so heads are
// never cropped and small photos are never stretched.
const FILL_MIN_RATIO = 0.95;
const FILL_MAX_RATIO = 1.6;

/** The photo's real pixel size. With a srcset the browser scales
 * naturalWidth by the chosen candidate's density, so a 600px photo can
 * report 108; a plain Image of the same (cached) URL reports the truth. */
function measure(img: HTMLImageElement, done: (w: number, h: number) => void): void {
  if (!img.currentSrc) {
    done(img.naturalWidth, img.naturalHeight);
    return;
  }
  const probe = new window.Image();
  probe.onload = () => done(probe.naturalWidth, probe.naturalHeight);
  probe.src = img.currentSrc;
}

export function CardPhoto({
  dog,
  priority,
  sizes,
}: {
  dog: Pick<Dog, "name" | "primary_image_url">;
  priority: boolean;
  sizes: string;
}): React.ReactElement {
  const [fit, setFit] = useState<"fill" | "whole">("fill");
  const [failed, setFailed] = useState(false);
  const src = dog.primary_image_url;

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const frameWidth = img.clientWidth;
    // The loaded copy is min(requested width, original width). If it came back
    // at the requested width the original is at least that big, so only a copy
    // narrower than requested says the source itself is small.
    const requested = Number(/[?,/]width=(\d+)/.exec(img.currentSrc)?.[1]) || Infinity;
    measure(img, (width, height) => {
      const ratio = width / height;
      const smallerThanFrame = width < frameWidth && width < requested;
      setFit(
        ratio >= FILL_MIN_RATIO && ratio <= FILL_MAX_RATIO && !smallerThanFrame
          ? "fill"
          : "whole",
      );
    });
  }, []);

  if (!src || failed) {
    return (
      <div
        className="absolute inset-0 grid place-items-center bg-soft text-subtle"
        data-testid="dog-photo-missing"
      >
        <span className="text-3xl" aria-hidden="true">
          🐾
        </span>
      </div>
    );
  }

  return (
    <>
      {fit === "whole" && (
        <Image
          src={src}
          alt=""
          aria-hidden="true"
          fill
          sizes={sizes}
          className="scale-110 object-cover opacity-60 blur-xl"
        />
      )}
      <Image
        src={src}
        alt={dog.name}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={handleLoad}
        onError={() => setFailed(true)}
        data-fit={fit}
        className={cn(
          "transition-transform duration-300 motion-reduce:transition-none",
          fit === "fill"
            ? "object-cover object-[center_30%] group-hover:scale-[1.03]"
            : "object-scale-down",
        )}
      />
    </>
  );
}

function FavoriteHeart({ dog }: { dog: Dog }): React.ReactElement {
  const { isFavorited, toggleFavorite } = useFavorites();
  const isFav = isFavorited(dog.id);

  return (
    <button
      type="button"
      className="group/heart absolute right-1 top-1 z-[2] grid h-11 w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={isFav ? `Remove ${dog.name} from favorites` : `Add ${dog.name} to favorites`}
      aria-pressed={isFav}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleFavorite(dog.id, dog.name, dog);
        if (dog.organization?.slug) {
          trackFavoriteToggle(isFav ? "remove" : "add", String(dog.id), dog.name, dog.organization.slug);
        }
      }}
    >
      {/* 44px tap target around a 36px disc */}
      <span className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-gray-900 shadow-sm transition-transform group-hover/heart:scale-105 motion-reduce:transition-none dark:bg-gray-900/90 dark:text-gray-50">
        <Heart
          className={cn("h-[18px] w-[18px]", isFav && "fill-red-600 text-red-600")}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}

function LivesWith({ facts }: { facts: Fact[] }): React.ReactElement | null {
  if (facts.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Lives with">
      {facts.map((fact) => (
        <li
          key={fact.label}
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            fact.good ? "bg-good-soft text-good" : "bg-bad-soft text-bad",
          )}
        >
          {fact.good ? "✓" : "✗"} {fact.label}
          <span className="sr-only">{fact.good ? ": yes" : ": no"}</span>
        </li>
      ))}
    </ul>
  );
}

function DogCard({
  dog,
  size = "grid",
  priority = false,
  position = 0,
  listContext = "home",
  onOpen,
  actions,
  notice,
}: DogCardProps): React.ReactElement {
  const href = `/dogs/${dog.slug || `unknown-dog-${dog.id}`}`;
  const summary = getDogSummary(dog);
  const where = getWhere(dog);
  const facts = getLivesWithFacts(dog);
  const compact = size === "compact";
  // A dog known only from its favorites snapshot has no page to link to
  const linked = Boolean(dog.slug) || !notice;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      trackDogCardClick(String(dog.id), dog.name, position, listContext);
      trackDogCardClicked(String(dog.id), position, listContext);
      if (onOpen && isPlainLeftClick(e)) {
        e.preventDefault();
        onOpen(dog);
      }
    },
    [dog, position, listContext, onOpen],
  );

  return (
    <article
      data-testid={`dog-card-${dog.id}`}
      data-size={size}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-card focus-within:ring-2 focus-within:ring-ring",
        compact
          ? cn("grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 p-2", actions && "sm:grid-cols-[6rem_minmax(0,1fr)_auto]")
          : "flex h-full flex-col",
        notice && "border-dashed bg-soft",
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-soft",
          compact ? "aspect-square w-24 self-start rounded-lg" : "aspect-[4/3] w-full",
          notice && "opacity-60 grayscale",
        )}
        data-testid="dog-photo"
      >
        <CardPhoto
          dog={dog}
          priority={priority}
          sizes={compact ? IMAGE_SIZES.THUMBNAIL : IMAGE_SIZES.CATALOG_CARD}
        />
        {!compact && <FavoriteHeart dog={dog} />}
        {!compact && <AdoptableBadge dog={dog} className="absolute left-2 top-2 z-[2] bg-surface/95 shadow-sm" />}
      </div>

      <div className={cn("min-w-0", compact ? "py-1 pr-1" : "px-3 pb-3 pt-2.5")}>
        <h3 className="truncate font-display text-lg font-bold leading-tight text-ink">
          {linked ? (
            // The link's ::after covers the whole card, so the card is one tap target.
            // A card that opens a modal (mobile) almost never navigates, so it must
            // not prefetch: that would render a dog page per card scrolled past
            <Link
              href={href}
              prefetch={onOpen ? false : undefined}
              onClick={handleClick}
              className="after:absolute after:inset-0 after:z-[1] after:content-[''] focus:outline-none"
            >
              {dog.name}
            </Link>
          ) : (
            dog.name
          )}
        </h3>
        {notice ?? (
          <>
            {summary && <p className="mt-0.5 line-clamp-2 text-sm text-subtle">{summary}</p>}
            {where && <p className="mt-0.5 truncate text-sm text-subtle">{where}</p>}
            <LivesWith facts={facts} />
          </>
        )}
      </div>
      {compact && actions && (
        // Above the card's link, so the buttons stay clickable
        <div className="relative z-[2] col-span-2 mt-2 flex items-center gap-2 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:self-center sm:pr-1">
          {actions}
        </div>
      )}
    </article>
  );
}

export default React.memo(DogCard);
