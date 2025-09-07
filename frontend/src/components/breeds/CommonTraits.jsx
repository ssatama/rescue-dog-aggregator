import React from 'react';

const CommonTraits = ({ personalityTraits }) => {
  if (!personalityTraits || personalityTraits.length === 0) {
    return null;
  }

  // Color scheme matching the mockup
  const getTraitColor = (trait) => {
    const lowerTrait = trait.toLowerCase();
    
    // Map traits to specific colors based on the mockup
    const colorMap = {
      'gentle': { bg: 'bg-purple-100', text: 'text-purple-800' },
      'calm': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'affectionate': { bg: 'bg-pink-100', text: 'text-pink-800' },
      'sweet': { bg: 'bg-purple-100', text: 'text-purple-800' },
      'loyal': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'quiet': { bg: 'bg-gray-100', text: 'text-gray-800' },
      'sensitive': { bg: 'bg-pink-100', text: 'text-pink-800' },
      'graceful': { bg: 'bg-purple-100', text: 'text-purple-800' },
      'lazy': { bg: 'bg-green-100', text: 'text-green-800' }
    };
    
    // Return specific color if mapped, otherwise cycle through default colors
    if (colorMap[lowerTrait]) {
      return colorMap[lowerTrait];
    }
    
    // Default color cycling for unmapped traits
    const defaultColors = [
      { bg: 'bg-blue-100', text: 'text-blue-800' },
      { bg: 'bg-green-100', text: 'text-green-800' },
      { bg: 'bg-purple-100', text: 'text-purple-800' },
      { bg: 'bg-pink-100', text: 'text-pink-800' },
      { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    ];
    
    const index = trait.length % defaultColors.length;
    return defaultColors[index];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">Common Traits</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Most frequently observed personality traits
      </p>
      
      <div className="flex flex-wrap gap-2">
        {personalityTraits.slice(0, 8).map((trait, index) => {
          const colors = getTraitColor(trait);
          
          return (
            <span
              key={`${trait}-${index}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}
            >
              {trait.charAt(0).toUpperCase() + trait.slice(1)}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default CommonTraits;