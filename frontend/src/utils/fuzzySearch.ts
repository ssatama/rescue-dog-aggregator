export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost,
      );
    }
  }

  return matrix[str2.length][str1.length];
}

export function fuzzySearch(query: string, items: string[], maxResults = 5): string[] {
  if (!query || query.length === 0) return [];

  const scored = items
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => {
      const normalizedItem = item.toLowerCase();
      const normalizedQuery = query.toLowerCase();

      if (normalizedItem === normalizedQuery) return { item, score: 100 };

      const words = normalizedItem.split(/\s+/);
      const queryWords = normalizedQuery.split(/\s+/);

      for (const word of words) {
        if (word.startsWith(normalizedQuery)) {
          return { item, score: 95 - normalizedQuery.length };
        }
      }

      if (normalizedItem.startsWith(normalizedQuery))
        return { item, score: 90 - normalizedQuery.length };

      if (queryWords.length > 1) {
        const matches = queryWords.every((qWord) =>
          words.some((word) => word.startsWith(qWord)),
        );
        if (matches) return { item, score: 85 };
      }

      if (normalizedItem.includes(normalizedQuery))
        return { item, score: 70 - normalizedQuery.length };

      const distance = levenshteinDistance(normalizedQuery, normalizedItem);
      const maxLength = Math.max(normalizedQuery.length, normalizedItem.length);
      if (distance <= maxLength * 0.4) {
        return { item, score: 50 - distance };
      }

      return null;
    })
    .filter((s): s is { item: string; score: number } => s !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return scored.map((s) => s.item);
}

export function generateDidYouMeanSuggestions(
  query: string,
  items: string[],
  maxSuggestions = 3,
): string[] {
  if (!query || query.length < 3) return [];

  const suggestions = items
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => {
      const distance = levenshteinDistance(
        query.toLowerCase(),
        item.toLowerCase(),
      );
      const similarity = 1 - distance / Math.max(query.length, item.length);
      return { item, similarity };
    })
    .filter((s) => s.similarity > 0.6 && s.similarity < 0.95)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxSuggestions)
    .map((s) => s.item);

  return suggestions;
}
