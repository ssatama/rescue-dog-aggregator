// Rotating pastel colors matching the main dog detail page EXACTLY
const PASTEL_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-purple-100 text-purple-800",
  "bg-yellow-100 text-yellow-800",
  "bg-pink-100 text-pink-800",
];

export const getPersonalityTraitColor = (trait: string): string => {
  // Use simple hash to consistently assign colors to traits
  let hash = 0;
  for (let i = 0; i < trait.length; i++) {
    hash = (hash << 5) - hash + trait.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % PASTEL_COLORS.length;
  return PASTEL_COLORS[index];
};
