export const getPersonalityTraitColor = (trait: string): string => {
  const normalizedTrait = trait.toLowerCase().trim();

  // Energetic traits - Orange
  if (
    ["energetic", "playful", "active", "lively", "spirited"].includes(
      normalizedTrait,
    )
  ) {
    return "bg-orange-100 text-orange-700 border border-orange-200";
  }

  // Gentle traits - Blue
  if (
    ["gentle", "calm", "relaxed", "peaceful", "mellow", "quiet"].includes(
      normalizedTrait,
    )
  ) {
    return "bg-blue-100 text-blue-700 border border-blue-200";
  }

  // Friendly traits - Pink
  if (
    [
      "friendly",
      "social",
      "loving",
      "affectionate",
      "sweet",
      "cuddly",
    ].includes(normalizedTrait)
  ) {
    return "bg-pink-100 text-pink-700 border border-pink-200";
  }

  // Smart traits - Purple
  if (
    ["smart", "clever", "intelligent", "trainable", "quick learner"].includes(
      normalizedTrait,
    )
  ) {
    return "bg-purple-100 text-purple-700 border border-purple-200";
  }

  // Loyal traits - Green
  if (
    ["loyal", "devoted", "faithful", "protective", "watchful"].includes(
      normalizedTrait,
    )
  ) {
    return "bg-green-100 text-green-700 border border-green-200";
  }

  // Cheerful traits - Yellow
  if (
    ["cheerful", "happy", "joyful", "optimistic", "upbeat"].includes(
      normalizedTrait,
    )
  ) {
    return "bg-yellow-100 text-yellow-700 border border-yellow-200";
  }

  // Independent traits - Gray
  if (
    ["independent", "confident", "self-assured", "bold"].includes(
      normalizedTrait,
    )
  ) {
    return "bg-gray-100 text-gray-700 border border-gray-200";
  }

  // Default color for unmatched traits
  return "bg-blue-100 text-blue-700 border border-blue-200";
};
