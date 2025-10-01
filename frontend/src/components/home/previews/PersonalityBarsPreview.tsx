// frontend/src/components/home/previews/PersonalityBarsPreview.tsx

'use client';

import { useEffect, useRef, useState } from 'react';

const traits = [
  {
    name: "Affectionate",
    value: 78,
    gradient: "from-purple-400 to-purple-600",
  },
  { name: "Energetic", value: 65, gradient: "from-orange-400 to-orange-600" },
  { name: "Intelligent", value: 82, gradient: "from-blue-400 to-blue-600" },
  { name: "Trainability", value: 75, gradient: "from-green-400 to-green-600" },
];

export default function PersonalityBarsPreview() {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full space-y-4 px-4">
      {traits.map((trait, index) => (
        <div key={trait.name}>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {trait.name}
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {trait.value}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
            <div
              className={`h-3 rounded-full bg-gradient-to-r ${trait.gradient} shadow-lg transition-all duration-1000 ease-out`}
              style={{ 
                width: isVisible ? `${trait.value}%` : '0%',
                transitionDelay: `${index * 150}ms`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}