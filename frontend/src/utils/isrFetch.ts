import { isPrerendering } from "./serverFetch";

/**
 * A cached fetcher's variant for an ISR page: .orThrow at request time, where
 * a failed regeneration keeps the last good page (#659); the fallback during
 * `next build`, where one fetch that keeps failing would abort every deploy,
 * and a degraded prerender is replaced at the next revalidation or purge.
 */
export function strictAtRuntime<F extends { orThrow: unknown }>(fetcher: F): F | F["orThrow"] {
  return isPrerendering() ? fetcher : fetcher.orThrow;
}
