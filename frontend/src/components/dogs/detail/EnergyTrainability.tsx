"use client";

import React from "react";
import { DogProfilerData } from "../../../types/dogProfiler";

interface EnergyTrainabilityProps {
  profilerData: DogProfilerData | null | undefined;
}

type EnergyLevel = "low" | "medium" | "high" | "very_high";
type TrainabilityLevel = "easy" | "moderate" | "challenging";

interface ProgressBarConfig {
  percentage: number;
  color: string;
  label: string;
}

// Pure function to get energy level configuration
const getEnergyConfig = (level: EnergyLevel): ProgressBarConfig | undefined => {
  const configs: Record<EnergyLevel, ProgressBarConfig> = {
    low: { percentage: 25, color: "bg-green-500", label: "Low" },
    medium: { percentage: 50, color: "bg-yellow-500", label: "Medium" },
    high: { percentage: 75, color: "bg-orange-500", label: "High" },
    very_high: { percentage: 100, color: "bg-red-500", label: "Very High" },
  };
  return configs[level];
};

// Pure function to get trainability configuration
const getTrainabilityConfig = (level: TrainabilityLevel): ProgressBarConfig | undefined => {
  const configs: Record<TrainabilityLevel, ProgressBarConfig> = {
    easy: { percentage: 33, color: "bg-green-500", label: "Easy" },
    moderate: { percentage: 67, color: "bg-yellow-500", label: "Moderate" },
    challenging: { percentage: 100, color: "bg-red-500", label: "Challenging" },
  };
  return configs[level];
};

// Pure function to check if confidence score should hide content
// Only hide if score is explicitly present AND low (<=0.5)
const shouldHideDueToLowConfidence = (score: number | undefined): boolean => {
  return typeof score === "number" && score <= 0.5;
};

// Pure component for rendering a single progress bar
interface ProgressBarProps {
  title: string;
  config: ProgressBarConfig;
  testId: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ title, config, testId }) => (
  <div className="mb-4" data-testid={`${testId}-progress`}>
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {title}
      </span>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {config.label}
      </span>
    </div>
    <div
      className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700"
      data-testid={`${testId}-progress-bg`}
    >
      <div
        className={`h-2 rounded-full transition-all duration-300 ${config.color}`}
        style={{ width: `${config.percentage}%` }}
        data-testid={`${testId}-progress-bar`}
      />
    </div>
  </div>
);

// Main component
const EnergyTrainability: React.FC<EnergyTrainabilityProps> = ({
  profilerData,
}) => {
  // Early return for invalid data
  if (!profilerData) {
    return null;
  }

  const { energy_level, trainability, confidence_scores } = profilerData;

  // Check if we should show energy level
  // Show if data exists, unless confidence score is explicitly low
  const energyConfig = energy_level
    ? getEnergyConfig(energy_level as EnergyLevel)
    : undefined;
  const trainabilityConfig = trainability
    ? getTrainabilityConfig(trainability as TrainabilityLevel)
    : undefined;

  const shouldShowEnergy =
    energyConfig && !shouldHideDueToLowConfidence(confidence_scores?.energy_level);

  const shouldShowTrainability =
    trainabilityConfig && !shouldHideDueToLowConfidence(confidence_scores?.trainability);

  if (!shouldShowEnergy && !shouldShowTrainability) {
    return null;
  }

  return (
    <div>
      {shouldShowEnergy && (
        <ProgressBar
          title="Energy Level"
          config={energyConfig}
          testId="energy"
        />
      )}

      {shouldShowTrainability && (
        <ProgressBar
          title="Trainability"
          config={trainabilityConfig}
          testId="trainability"
        />
      )}
    </div>
  );
};

export default EnergyTrainability;