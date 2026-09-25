import posthog, { type CaptureOptions } from "posthog-js";
import { getAgeCategory } from "@/utils/dogHelpers";
import { reportError } from "@/utils/logger";

// Product analytics events for PostHog. Every posthog.capture() goes through
// this file so the event names and their properties live in one place.
//
// The site's goal is the adoption click: `adoption_link_clicked` is the
// conversion event and `dog_viewed` is the step before it. Both carry the same
// dog properties so a funnel can be broken down by organization, breed, size or
// age without joins.
//
// Sentry breadcrumbs in lib/monitoring/breadcrumbs.ts are a separate concern
// (debugging context attached to errors) and stay where they are.

/** The fields we read from a dog. Loose on purpose: the detail page, the mobile
 * modal and the favorites comparison each pass a slightly different shape. */
export interface AnalyticsDog {
  id: number | string;
  name?: string;
  slug?: string;
  standardized_breed?: string;
  breed?: string;
  age_min_months?: number;
  age_text?: string;
  sex?: string;
  standardized_size?: string;
  size?: string;
  adoption_url?: string;
  organization?: { slug?: string; name?: string; country?: string } | null;
}

export type DogViewSource = "detail_page" | "modal";
export type AdoptionSource = "detail_page" | "modal" | "comparison" | "favorites";
/** Which adopt button on the dog page: the desktop panel or the phone bar (#489). */
export type AdoptionPlacement = "panel" | "bar";

// Outbound clicks send at once instead of joining the 3-second batch: opening
// the rescue's site backgrounds this tab, and a mobile browser may suspend it
// before the batch flushes.
const OUTBOUND: CaptureOptions = { send_instantly: true };

/** Never throws: tracking runs inside click handlers that must still work. */
function capture(
  event: string,
  properties: Record<string, unknown>,
  options?: CaptureOptions,
): void {
  if (!posthog.__loaded) return;
  try {
    posthog.capture(event, properties, options);
  } catch (error) {
    reportError(error, { context: "analytics.capture", event });
  }
}

function hostname(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function dogProperties(dog: AnalyticsDog): Record<string, unknown> {
  return {
    dog_id: String(dog.id),
    dog_slug: dog.slug ?? null,
    dog_name: dog.name ?? null,
    breed: dog.standardized_breed || dog.breed || null,
    // The API has no age category, so derive it the way the UI does
    age_category: getAgeCategory({
      age_min_months: dog.age_min_months,
      age_text: dog.age_text,
    }),
    sex: dog.sex ?? null,
    size: dog.standardized_size || dog.size || null,
    org_slug: dog.organization?.slug ?? null,
    org_name: dog.organization?.name ?? null,
    org_country: dog.organization?.country ?? null,
  };
}

export function trackDogViewed(dog: AnalyticsDog, source: DogViewSource): void {
  capture("dog_viewed", { ...dogProperties(dog), source });
}

/** The conversion event: the visitor left for the rescue's adoption page. */
export function trackAdoptionLinkClicked(
  dog: AnalyticsDog,
  source: AdoptionSource,
  placement?: AdoptionPlacement,
): void {
  capture(
    "adoption_link_clicked",
    {
      ...dogProperties(dog),
      source,
      ...(placement && { placement }),
      destination_domain: hostname(dog.adoption_url),
    },
    OUTBOUND,
  );
}

export function trackDogCardClicked(
  dogId: string,
  position: number,
  listContext: string,
): void {
  capture("dog_card_clicked", {
    dog_id: dogId,
    position,
    list_context: listContext,
  });
}

export function trackFavoriteChanged(
  action: "add" | "remove",
  dogId: number,
): void {
  capture(action === "add" ? "dog_favorited" : "dog_unfavorited", {
    dog_id: String(dogId),
  });
}

export function trackFavoritesViewed(count: number): void {
  capture("favorites_viewed", { favorites_count: count });
}

// Search, filter and location events. Their properties are closed sets so no
// free text can reach PostHog: nothing a visitor types is ever sent, only which
// kind of result they picked and how many results they saw.

/** Where a search box sits: the global header search, the catalog sidebar, or
 * the mobile layout. */
export type SearchSurface = "header" | "catalog" | "mobile" | "home";
/** What the visitor chose from a search: a suggestion of that kind, a filter,
 * or `none` when they submitted the typed text. */
export type SearchResultGroup = "breed" | "rescue" | "dog" | "filter" | "none";
export type FilterSurface = "catalog" | "breed_page" | "org_page";
export type LocationSource = "geo" | "picker";

/** `resultCount` is null where the page does not know its result total yet. */
export function trackSearchPerformed(
  surface: SearchSurface,
  resultGroupChosen: SearchResultGroup,
  resultCount: number | null,
): void {
  capture("search_performed", {
    surface,
    result_group_chosen: resultGroupChosen,
    result_count: resultCount,
  });
}

// The filter state keys each page uses, mapped to one name per filter. A key
// that is not here (typed search, sort) never becomes a filter_applied event.
const FILTER_NAMES: Record<string, string> = {
  sizeFilter: "size",
  ageFilter: "age",
  age: "age",
  sexFilter: "sex",
  sex: "sex",
  breedFilter: "breed",
  breed: "breed",
  breedGroupFilter: "breed_group",
  organizationFilter: "organization",
  locationCountryFilter: "location_country",
  availableCountryFilter: "available_country",
  shipsTo: "available_country",
  availableRegionFilter: "available_region",
  goodWithKidsFilter: "good_with_kids",
  goodWithDogsFilter: "good_with_dogs",
  goodWithCatsFilter: "good_with_cats",
  firstTimeFriendlyFilter: "first_time_friendly",
  energyFilter: "energy",
};

/** One event per changed filter. Only pass values picked from a fixed list:
 * a breed typed into a box is free text and must not be tracked. */
export function trackFiltersApplied(
  changes: Record<string, string | undefined>,
  surface: FilterSurface,
  resultCount: number | null = null,
): void {
  for (const [key, value] of Object.entries(changes)) {
    const filter = FILTER_NAMES[key];
    if (!filter) continue;
    capture("filter_applied", {
      filter,
      value: value ?? null,
      result_count: resultCount,
      surface,
    });
  }
}

export function trackSortChanged(sort: string): void {
  capture("sort_changed", { sort });
}

export function trackGalleryPhotoViewed(
  dogId: number | string,
  index: number,
  total: number,
): void {
  capture("gallery_photo_viewed", { dog_id: String(dogId), index, total });
}

/** `country` is the ISO code the visitor lives in, or null for "Anywhere". */
export function trackLocationSet(
  source: LocationSource,
  country: string | null,
  onlyAdoptable: boolean,
): void {
  capture("location_set", {
    source,
    country,
    only_adoptable: onlyAdoptable,
  });
}

export function trackOrganizationViewed(
  orgSlug: string,
  dogCount: number,
): void {
  capture("organization_viewed", { org_slug: orgSlug, dog_count: dogCount });
}

export function trackOrganizationWebsiteClicked(
  orgSlug: string,
  websiteUrl: string,
): void {
  capture(
    "organization_website_clicked",
    {
      org_slug: orgSlug,
      destination_domain: hostname(websiteUrl),
    },
    OUTBOUND,
  );
}
