// Rotating pastel colors matching the main dog detail page EXACTLY
const PASTEL_COLORS = [
  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
];

export const getPersonalityTraitColor = (trait: string): string => {
  const lowerTrait = trait.toLowerCase();
  
  // Semantic color mapping
  if (lowerTrait.includes('soft') || lowerTrait.includes('gentle') || lowerTrait.includes('sweet')) {
    return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300";
  }
  if (lowerTrait.includes('squishy') || lowerTrait.includes('playful') || lowerTrait.includes('goofy')) {
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
  }
  if (lowerTrait.includes('sweet-natured') || lowerTrait.includes('loving')) {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
  }

  // Use simple hash for other traits
  let hash = 0;
  for (let i = 0; i < trait.length; i++) {
    hash = (hash << 5) - hash + trait.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % PASTEL_COLORS.length;
  return PASTEL_COLORS[index];
};
