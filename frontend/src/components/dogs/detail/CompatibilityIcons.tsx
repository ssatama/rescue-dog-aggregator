import React from "react";
import { DogProfilerData } from "../../../types/dogProfiler";

interface CompatibilityIconsProps {
  profilerData?: DogProfilerData | null;
}

interface CompatibilityItem {
  key: string;
  label: string;
  value?: string;
  confidenceKey: string;
  testId: string;
}

const getCompatibilityIcon = (value: string): string => {
  switch (value) {
    case "yes":
      return "✓";
    case "no":
      return "✗";
    case "maybe":
    case "selective":
    case "with_training":
      return "?";
    case "older_children":
      return "✓";
    case "unknown":
    default:
      return "-";
  }
};

const getCompatibilityColor = (value: string): string => {
  switch (value) {
    case "yes":
      return "bg-green-100";
    case "no":
      return "bg-red-100";
    case "maybe":
    case "selective":
    case "with_training":
      return "bg-yellow-100";
    case "older_children":
      return "bg-blue-100";
    case "unknown":
    default:
      return "bg-gray-100";
  }
};

const hasHighConfidence = (
  profilerData: DogProfilerData | null | undefined,
  confidenceKey: string
): boolean => {
  if (!profilerData?.confidence_scores) {
    return false;
  }
  const score = profilerData.confidence_scores[confidenceKey];
  return typeof score === "number" && score > 0.5;
};

const CompatibilityIcons: React.FC<CompatibilityIconsProps> = ({ profilerData }) => {
  if (!profilerData) {
    return null;
  }

  const compatibilityItems: CompatibilityItem[] = [
    {
      key: "dogs",
      label: "Dogs",
      value: profilerData.good_with_dogs,
      confidenceKey: "good_with_dogs",
      testId: "dogs-compatibility"
    },
    {
      key: "cats",
      label: "Cats",
      value: profilerData.good_with_cats,
      confidenceKey: "good_with_cats",
      testId: "cats-compatibility"
    },
    {
      key: "children",
      label: "Children",
      value: profilerData.good_with_children,
      confidenceKey: "good_with_children",
      testId: "children-compatibility"
    }
  ];

  const validItems = compatibilityItems.filter(item => 
    item.value && hasHighConfidence(profilerData, item.confidenceKey)
  );

  if (validItems.length === 0) {
    return null;
  }

  return (
    <div 
      data-testid="compatibility-icons-container"
      className="flex gap-3"
    >
      {validItems.map(item => {
        const icon = getCompatibilityIcon(item.value!);
        const colorClass = getCompatibilityColor(item.value!);
        
        return (
          <div
            key={item.key}
            data-testid={item.testId}
            className="flex flex-col items-center gap-1"
          >
            <div
              data-testid={`compatibility-icon-${item.key}`}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${colorClass}`}
            >
              {icon}
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default CompatibilityIcons;