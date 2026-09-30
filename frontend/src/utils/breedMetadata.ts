/** "Average age 7 years. " for a breed page's meta description; nothing when unknown. */
export function averageAgeSentence(months?: number): string {
  if (!months) return "";
  if (months < 12) return `Average age ${months} months. `;
  const years = Math.round(months / 12);
  return `Average age ${years} year${years === 1 ? "" : "s"}. `;
}
