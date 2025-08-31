import React from "react";

interface PersonalityTraitsProps {
  traits?: string[];
  maxTraits?: number;
}

export function PersonalityTraits({ traits, maxTraits = 3 }: PersonalityTraitsProps) {
  if (!traits || traits.length === 0) {
    return null;
  }

  const cleanTraits = traits
    .map(trait => trait.trim())
    .filter(trait => trait.length > 0)
    .slice(0, maxTraits);

  if (cleanTraits.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2" role="list">
      {cleanTraits.map((trait, index) => (
        <span
          key={index}
          role="listitem"
          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
        >
          {trait}
        </span>
      ))}
    </div>
  );
}