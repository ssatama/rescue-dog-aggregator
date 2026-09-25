"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowUpRight } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { useFavorites } from "../../hooks/useFavorites";
import { useToast } from "../../contexts/ToastContext";
import DogCard from "../../components/dogs/DogCard";
import EmptyState from "../../components/ui/EmptyState";
import ShareButton from "../../components/ui/ShareButton";
import FavoritesInsights from "../../components/favorites/FavoritesInsights";
import NoLongerListed, {
  isListed,
  similarBreed,
  type SimilarLink,
} from "../../components/favorites/NoLongerListed";
import FilterPanelSkeleton from "../../components/ui/FilterPanelSkeleton";
import CompareSkeleton from "../../components/ui/CompareSkeleton";
import { trackFavoritesPageView } from "@/lib/monitoring/breadcrumbs";
import { trackAdoptionLinkClicked, trackFavoritesViewed } from "@/lib/analytics";
import { useVisitorLocation } from "@/lib/visitorLocation";
import { catalogCountryValue } from "@/utils/adoptability";
import { dogFromSnapshot, readSnapshots, rememberDogs } from "@/utils/favoriteSnapshots";
import { safeExternalUrl } from "@/utils/security";
import { dogCountLabel } from "@/utils/formatCount";
import { getAnimalsByIds, getAvailableCountries, getFilterCounts } from "../../services/animalsService";
import { reportError } from "../../utils/logger";
import type { Dog } from "../../types/dog";

const FilterPanel = dynamic(() => import("../../components/favorites/FilterPanel"), {
  loading: () => <FilterPanelSkeleton />,
  ssr: false,
});

const CompareMode = dynamic(() => import("../../components/favorites/CompareMode"), {
  loading: () => <CompareSkeleton />,
  ssr: false,
});

/** Filters only earn their space on a long list (#498). */
const FILTER_FROM = 7;

const SMALL_BUTTON =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const PRIMARY_BUTTON = `${SMALL_BUTTON} bg-orange-700 text-white hover:bg-orange-800`;
const SECONDARY_BUTTON = `${SMALL_BUTTON} border border-line bg-surface text-ink hover:bg-soft`;

function AdoptButton({ dog }: { dog: Dog }): React.ReactElement | null {
  const url = safeExternalUrl(dog.adoption_url);
  if (!url) return null;
  const track = () => trackAdoptionLinkClicked(dog, "favorites");
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      onClick={track}
      // Middle-click opens the link too
      onAuxClick={(e) => e.button === 1 && track()}
      className={`${PRIMARY_BUTTON} min-w-0 flex-1 sm:max-w-64 sm:flex-none`}
    >
      <span className="truncate">Meet {dog.name}</span>
      <ArrowUpRight className="h-4 w-4 flex-none" aria-hidden="true" />
      <span className="sr-only"> (opens the rescue&apos;s site in a new tab)</span>
    </a>
  );
}

function RemoveButton({ dog }: { dog: Dog }): React.ReactElement {
  const { removeFavorite } = useFavorites();
  return (
    <button type="button" onClick={() => removeFavorite(dog.id, dog.name)} className={SECONDARY_BUTTON}>
      Remove<span className="sr-only"> {dog.name}</span>
    </button>
  );
}

/** Replacement counts per breed for the dogs that left, narrowed to the
 * visitor's country when a listed rescue adopts out there. */
function useSimilarLinks(unlisted: Dog[]): { links: Record<string, SimilarLink>; adoptable: boolean } | null {
  const { country } = useVisitorLocation();
  const breedsKey = [...new Set(unlisted.map(similarBreed).filter(Boolean))].join("|");
  const [result, setResult] = useState<{ links: Record<string, SimilarLink>; adoptable: boolean } | null>(null);

  useEffect(() => {
    if (!breedsKey) return;
    let cancelled = false;
    (async () => {
      const target = country ? catalogCountryValue(await getAvailableCountries(), country) : null;
      const entries = await Promise.all(
        breedsKey.split("|").map(async (breed): Promise<[string, SimilarLink]> => {
          const counts = await getFilterCounts({ primary_breed: breed, ...(target && { available_to_country: target }) });
          const query = new URLSearchParams({ breed, ...(target && { available_country: target }) });
          return [breed, { count: counts.total ?? 0, href: `/dogs?${query}` }];
        }),
      );
      if (!cancelled) setResult({ links: Object.fromEntries(entries), adoptable: Boolean(target) });
    })().catch((error: unknown) => {
      // The rows still show; only the "see similar" links are missing
      reportError(error, { context: "favorites_similar_counts" });
    });
    return () => {
      cancelled = true;
    };
  }, [breedsKey, country]);

  return result;
}

function FavoritesPageContent(): React.JSX.Element {
  const { favorites, count, getShareableUrl, loadFromUrl, isHydrated } = useFavorites();
  const { showToast } = useToast();
  // What the API returned per saved id, and the ids it had nothing for, rebuilt
  // from their snapshots. Saved dogs are never dropped from the list (#498).
  const [fetched, setFetched] = useState<Map<number, Dog>>(() => new Map());
  const [missing, setMissing] = useState<Map<number, Dog>>(() => new Map());
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(new Set<number>());
  const [filterIds, setFilterIds] = useState<Set<string | number> | null>(null);
  const [showCompareMode, setShowCompareMode] = useState(false);

  // Load favorites from a shared link on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("shared") || urlParams.has("ids") || urlParams.has("c")) {
      loadFromUrl(window.location.href);
    }
  }, [loadFromUrl]);

  useEffect(() => {
    try {
      trackFavoritesPageView(favorites.length);
    } catch (trackError) {
      reportError(trackError, { context: "trackFavoritesPageView" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Track only on mount
  }, []);

  // Once, after favorites load from localStorage: on a direct load the mount
  // effect above runs before the provider's and would always report 0.
  const favoritesViewTracked = useRef(false);
  useEffect(() => {
    if (isHydrated && !favoritesViewTracked.current) {
      favoritesViewTracked.current = true;
      trackFavoritesViewed(favorites.length);
    }
  }, [isHydrated, favorites.length]);

  // Fetch each saved id once; removing a dog needs no refetch
  useEffect(() => {
    if (!isHydrated) return;
    const ids = favorites.filter((id) => !requested.current.has(id));
    if (ids.length === 0) return;
    ids.forEach((id) => requested.current.add(id));

    getAnimalsByIds(ids)
      .then((dogs) => {
        rememberDogs(dogs);
        const returned = new Set(dogs.map((dog) => Number(dog.id)));
        const snapshots = readSnapshots();
        setFetched((prev) => new Map([...prev, ...dogs.map((dog): [number, Dog] => [Number(dog.id), dog])]));
        setMissing(
          (prev) =>
            new Map([
              ...prev,
              ...ids
                .filter((id) => !returned.has(id))
                .map((id): [number, Dog] => [id, dogFromSnapshot(id, snapshots[id] ?? { name: "A saved dog" })]),
            ]),
        );
      })
      .catch((fetchError: unknown) => {
        reportError(fetchError, { context: "fetchFavoriteDogs", favoriteCount: ids.length });
        setError("Failed to load your favorite dogs. Please try again.");
      });
  }, [favorites, isHydrated]);

  // Newest saved first; the dogs still listed, then the ones that left
  const { listed, unlisted } = useMemo(() => {
    const saved = favorites
      .toReversed()
      .map((id) => fetched.get(id) ?? missing.get(id))
      .filter((dog): dog is Dog => dog !== undefined);
    return {
      listed: saved.filter((dog) => fetched.has(Number(dog.id)) && isListed(dog)),
      unlisted: saved.filter((dog) => !fetched.has(Number(dog.id)) || !isListed(dog)),
    };
  }, [favorites, fetched, missing]);

  const filtering = listed.length >= FILTER_FROM;
  const shown = filtering && filterIds ? listed.filter((dog) => filterIds.has(dog.id)) : listed;
  const similar = useSimilarLinks(unlisted);

  const handleFilter = useCallback(
    (filtered: Dog[], isUserInitiated = false) => {
      setFilterIds(new Set(filtered.map((dog) => dog.id)));
      if (isUserInitiated) {
        showToast("success", `Filtered to ${dogCountLabel(filtered.length)}`);
      }
    },
    [showToast],
  );

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="Something went wrong"
          description={error}
          actionButton={{ text: "Try Again", onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  if (isHydrated && count === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:py-24">
        <h1 className="font-display text-3xl font-bold text-ink">No saved dogs yet</h1>
        <p className="mt-3 text-subtle">
          Tap the heart on any dog to keep it here. Your list stays in this browser, no account needed.
        </p>
        <Link href="/dogs" className={`${PRIMARY_BUTTON} mt-6 px-5`}>
          Browse dogs
        </Link>
      </div>
    );
  }

  const loading = !isHydrated || listed.length + unlisted.length < count;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:pt-8">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-display text-3xl font-bold text-ink">Saved dogs</h1>
        <p className="text-sm text-subtle">
          {isHydrated && `${dogCountLabel(count)} · `}kept only in this browser
        </p>
        {!loading && (
          <div className="flex gap-2 sm:ml-auto">
            {shown.length >= 2 && (
              <button type="button" onClick={() => setShowCompareMode(true)} className={SECONDARY_BUTTON}>
                Compare
              </button>
            )}
            <ShareButton
              url={getShareableUrl()}
              title="My Favorite Rescue Dogs"
              text={`Check out my collection of ${count} favorite rescue dogs!`}
              variant="ghost"
              size="sm"
              className="min-h-11 rounded-lg border border-line bg-surface px-3 font-semibold hover:bg-soft"
            >
              Share list
            </ShareButton>
          </div>
        )}
      </header>

      {loading ? (
        <ul className="mt-5 grid gap-3" aria-busy="true" aria-label="Loading saved dogs">
          {Array.from({ length: Math.min(Math.max(count, 1), 4) }, (_, i) => (
            <li key={i} className="h-28 animate-pulse rounded-xl bg-soft" />
          ))}
        </ul>
      ) : (
        <>
          {filtering && (
            <div className="mt-4">
              <FilterPanel dogs={listed} onFilter={handleFilter} />
            </div>
          )}

          {listed.length > 0 && (
            <ul className="mt-5 grid gap-3" data-testid="saved-dogs">
              {shown.map((dog, i) => (
                <li key={dog.id}>
                  <DogCard
                    dog={dog}
                    size="compact"
                    position={i}
                    listContext="favorites"
                    priority={i < 4}
                    actions={
                      <>
                        <AdoptButton dog={dog} />
                        <RemoveButton dog={dog} />
                      </>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
          {filtering && shown.length === 0 && (
            <p className="mt-6 text-center text-subtle">No saved dogs match these filters.</p>
          )}

          {unlisted.length > 0 && (
            <section className="mt-8" aria-labelledby="no-longer-listed" data-testid="no-longer-listed">
              <h2 id="no-longer-listed" className="font-display text-lg font-bold text-ink">
                No longer listed
              </h2>
              <p className="mt-1 text-sm text-subtle">
                Their rescues stopped listing them. We keep them here until you remove them.
              </p>
              <ul className="mt-3 grid gap-3">
                {unlisted.map((dog, i) => {
                  const breed = similarBreed(dog);
                  return (
                    <li key={dog.id}>
                      <DogCard
                        dog={dog}
                        size="compact"
                        position={listed.length + i}
                        listContext="favorites"
                        notice={
                          <NoLongerListed
                            dog={dog}
                            similar={breed ? similar?.links[breed] : null}
                            adoptable={similar?.adoptable}
                          />
                        }
                        actions={<RemoveButton dog={dog} />}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {shown.length >= 2 && (
            <div className="mt-8">
              <FavoritesInsights dogs={shown} />
            </div>
          )}
        </>
      )}

      {showCompareMode && <CompareMode dogs={shown} onClose={() => setShowCompareMode(false)} />}
    </div>
  );
}

export default function FavoritesClient(): React.JSX.Element {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            title="Something went wrong"
            description="There was an error loading your favorites. Please refresh the page."
            actionButton={{
              text: "Refresh Page",
              onClick: () => window.location.reload(),
            }}
          />
        </div>
      }
      onError={(error) => {
        reportError(error, { context: "FavoritesClient-ErrorBoundary" });
      }}
    >
      <FavoritesPageContent />
    </ErrorBoundary>
  );
}
