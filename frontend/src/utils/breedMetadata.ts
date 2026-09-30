/** A breed's average age as the page shows it: "8 mo", "3 yrs", "6.9 yrs". */
export function formatAverageAge(months: number): string {
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years} yr${years === 1 ? "" : "s"}`;
  return `${years}.${Math.floor((remainingMonths / 12) * 10)} yrs`;
}

/** "Average age 6.9 yrs. " for a breed page's meta description; nothing when unknown. */
export function averageAgeSentence(months?: number): string {
  return months ? `Average age ${formatAverageAge(months)}. ` : "";
}
