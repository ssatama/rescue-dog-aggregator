import posthog from "posthog-js";

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
  age_category?: string;
  sex?: string;
  standardized_size?: string;
  size?: string;
  adoption_url?: string;
  organization?: { slug?: string; name?: string; country?: string } | null;
}

export type DogViewSource = "detail_page" | "modal";
export type AdoptionSource = "detail_page" | "modal" | "comparison";

function capture(event: string, properties: Record<string, unknown>): void {
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
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
    age_category: dog.age_category ?? null,
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
): void {
  capture("adoption_link_clicked", {
    ...dogProperties(dog),
    source,
    destination_domain: hostname(dog.adoption_url),
  });
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

export function trackSearchSubmitted(query: string, suggestionCount: number): void {
  capture("search_submitted", {
    query,
    suggestion_count: suggestionCount,
  });
}

/** `filterType` is "sort" for sort changes, so one event covers the toolbar. */
export function trackFilterChanged(
  filterType: string,
  value: unknown,
  resultCount: number,
): void {
  capture("filter_changed", {
    filter_type: filterType,
    value: typeof value === "string" ? value : JSON.stringify(value),
    result_count: resultCount,
  });
}

export function trackDogSwiped(
  direction: "left" | "right",
  dog: AnalyticsDog,
): void {
  capture("dog_swiped", { ...dogProperties(dog), direction });
}

export function trackOrganizationViewed(orgSlug: string, dogCount: number): void {
  capture("organization_viewed", { org_slug: orgSlug, dog_count: dogCount });
}

export function trackOrganizationWebsiteClicked(
  orgSlug: string,
  websiteUrl: string,
): void {
  capture("organization_website_clicked", {
    org_slug: orgSlug,
    destination_domain: hostname(websiteUrl),
  });
}
