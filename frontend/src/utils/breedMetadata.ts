/** A breed's average age as the page shows it: "8 mo", "3 yrs", "6.9 yrs". */
export function formatAverageAge(months: number): string {
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const tenths = Math.floor(((months % 12) / 12) * 10);
  // 13 months is "1 yr", not "1.0 yrs"
  if (tenths === 0) return `${years} yr${years === 1 ? "" : "s"}`;
  return `${years}.${tenths} yrs`;
}

/** "Average age 6.9 yrs. " for a breed page's meta description; nothing when unknown. */
export function averageAgeSentence(months?: number): string {
  return months ? `Average age ${formatAverageAge(months)}. ` : "";
}
