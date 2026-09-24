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

// Explicit text colours with dark variants: the marks used to inherit the dark theme's
// near-white foreground on these pale backgrounds, a 1.05:1 contrast (#448)
const getCompatibilityColor = (value: string): string => {
  switch (value) {
    case "yes":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    case "no":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    case "maybe":
    case "selective":
    case "with_training":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
    case "older_children":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
    case "unknown":
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
};

// What a screen reader should say instead of ✓ / ✗ / ? / -
const getCompatibilityText = (value: string): string => {
  switch (value) {
    case "yes":
      return "yes";
    case "no":
      return "no";
    case "maybe":
    case "selective":
      return "maybe";
    case "with_training":
      return "with training";
    case "older_children":
      return "older children only";
    default:
      return "unknown";
  }
};

const shouldHideDueToLowConfidence = (
  profilerData: DogProfilerData | null | undefined,
  confidenceKey: string,
): boolean => {
  // Only hide if confidence score is explicitly present AND low (<=0.5)
  const score = profilerData?.confidence_scores?.[confidenceKey];
  return typeof score === "number" && score <= 0.5;
};

/** The compatibility answers worth drawing, after dropping anything the model
 * was not confident about. */
const visibleCompatibilityItems = (
  profilerData: DogProfilerData | null | undefined,
): CompatibilityItem[] => {
  if (!profilerData) {
    return [];
  }

  const compatibilityItems: CompatibilityItem[] = [
    {
      key: "dogs",
      label: "Dogs",
      value: profilerData.good_with_dogs,
      confidenceKey: "good_with_dogs",
      testId: "dogs-compatibility",
    },
    {
      key: "cats",
      label: "Cats",
      value: profilerData.good_with_cats,
      confidenceKey: "good_with_cats",
      testId: "cats-compatibility",
    },
    {
      key: "children",
      label: "Children",
      value: profilerData.good_with_children,
      confidenceKey: "good_with_children",
      testId: "children-compatibility",
    },
  ];

  // Show items if data exists, unless confidence score is explicitly low
  return compatibilityItems.filter(
    (item) =>
      item.value &&
      !shouldHideDueToLowConfidence(profilerData, item.confidenceKey),
  );
};

/** Whether the Good With section has anything to show. */
export const hasCompatibilitySection = (
  profilerData: DogProfilerData | null | undefined,
): profilerData is DogProfilerData =>
  visibleCompatibilityItems(profilerData).length > 0;

const CompatibilityIcons: React.FC<CompatibilityIconsProps> = ({
  profilerData,
}) => {
  const validItems = visibleCompatibilityItems(profilerData);

  if (validItems.length === 0) {
    return null;
  }

  return (
    <div data-testid="compatibility-icons-container" className="flex gap-3">
      {validItems.map((item) => {
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
              role="img"
              aria-label={`Good with ${item.label.toLowerCase()}: ${getCompatibilityText(item.value!)}`}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${colorClass}`}
            >
              <span aria-hidden="true">{icon}</span>
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
