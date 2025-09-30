/**
 * Calculates Levenshtein distance for fuzzy matching
 * @param {string} str1 - First string to compare
 * @param {string} str2 - Second string to compare
 * @returns {number} The Levenshtein distance between the two strings
 */
export function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1)
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

/**
 * Enhanced fuzzy search with word-level matching for better breed suggestions
 * @param {string} query - The search query
 * @param {string[]} items - Array of items to search through
 * @param {number} maxResults - Maximum number of results to return (default: 5)
 * @returns {string[]} Array of matching items sorted by relevance
 */
export function fuzzySearch(query, items, maxResults = 5) {
  if (!query || query.length === 0) return [];

  const scored = items
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => {
      const normalizedItem = item.toLowerCase();
      const normalizedQuery = query.toLowerCase();

      // Exact match gets highest score
      if (normalizedItem === normalizedQuery) return { item, score: 100 };

      // Check if any word in the item starts with the query (for multi-word breeds)
      const words = normalizedItem.split(/\s+/);
      const queryWords = normalizedQuery.split(/\s+/);

      // Check if any word in the breed starts with the query
      for (const word of words) {
        if (word.startsWith(normalizedQuery)) {
          return { item, score: 95 - normalizedQuery.length };
        }
      }

      // Check if the full string starts with query
      if (normalizedItem.startsWith(normalizedQuery))
        return { item, score: 90 - normalizedQuery.length };

      // Check if query matches beginning of multi-word search
      if (queryWords.length > 1) {
        const matches = queryWords.every((qWord) =>
          words.some((word) => word.startsWith(qWord)),
        );
        if (matches) return { item, score: 85 };
      }

      // Contains query gets medium score
      if (normalizedItem.includes(normalizedQuery))
        return { item, score: 70 - normalizedQuery.length };

      // Fuzzy match based on Levenshtein distance
      const distance = levenshteinDistance(normalizedQuery, normalizedItem);
      const maxLength = Math.max(normalizedQuery.length, normalizedItem.length);
      if (distance <= maxLength * 0.4) {
        return { item, score: 50 - distance };
      }

      return null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return scored.map((s) => s.item);
}

/**
 * Generates "Did you mean?" suggestions
 * @param {string} query - The search query
 * @param {string[]} items - Array of items to generate suggestions from
 * @param {number} maxSuggestions - Maximum number of suggestions to return (default: 3)
 * @returns {string[]} Array of suggested corrections
 */
export function generateDidYouMeanSuggestions(
  query,
  items,
  maxSuggestions = 3,
) {
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
