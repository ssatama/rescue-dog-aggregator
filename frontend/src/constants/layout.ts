/** One dog grid everywhere (#496): 2 columns on phones, 3 from 640px (tablets,
 * and 1024–1279 beside the filter sidebar), 4 from 1280px. */
export const DOG_GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4";

/** The widths at which DOG_GRID changes, widest first, as [query, columns]. */
export const DOG_GRID_BREAKPOINTS: readonly [string, number][] = [
  ["(min-width: 1280px)", 4],
  ["(min-width: 640px)", 3],
];
export const DOG_GRID_MIN_COLUMNS = 2;

/** Dogs per home row (#497): two full rows at 2 and at 4 columns. */
export const HOME_ROW_DOGS = 8;
