const CATEGORY_LABELS: Record<string, string> = {
  "adoption-process": "Adopting from abroad",
  "financial-planning": "Costs",
  "owner-preparation": "First-time owners",
};

/** A guide's category as words, never its slug (#503) */
export function guideCategoryLabel(category: string): string {
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
  const words = category.replace(/[-_]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "31 Aug 2026", the same on the server and in every browser */
export function formatGuideDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
