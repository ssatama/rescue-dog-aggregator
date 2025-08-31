import React from "react";

interface EnergyIndicatorProps {
  level: number;
}

export function EnergyIndicator({ level }: EnergyIndicatorProps) {
  const normalizedLevel = Math.max(0, Math.min(5, level));
  
  return (
    <div 
      className="flex items-center gap-2"
      role="group"
      aria-label={`Energy level: ${normalizedLevel} out of 5`}
      data-testid="energy-indicator"
    >
      <span className="text-sm text-gray-600">Energy:</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((dotLevel) => (
          <div
            key={dotLevel}
            data-testid={dotLevel <= normalizedLevel ? "energy-dot-filled" : "energy-dot-empty"}
            className={`w-2 h-2 rounded-full ${
              dotLevel <= normalizedLevel
                ? "bg-orange-500"
                : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}