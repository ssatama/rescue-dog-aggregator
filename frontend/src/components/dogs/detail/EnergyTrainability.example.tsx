/**
 * Usage Example for EnergyTrainability Component
 *
 * This file demonstrates how to use the EnergyTrainability component
 * in different scenarios. This is for documentation purposes only.
 */
import React from "react";
import EnergyTrainability from "./EnergyTrainability";
import { DogProfilerData } from "../../../types/dogProfiler";

// Example 1: High energy, easy trainability (both shown)
const highEnergyEasyTrain: DogProfilerData = {
  energy_level: "very_high",
  trainability: "easy",
  confidence_scores: {
    energy_level: 0.9,
    trainability: 0.8,
  },
};

// Example 2: Only energy shown (trainability has low confidence)
const onlyEnergyShown: DogProfilerData = {
  energy_level: "medium",
  trainability: "moderate",
  confidence_scores: {
    energy_level: 0.7,
    trainability: 0.4, // Too low, won't show
  },
};

// Example 3: Only trainability shown (energy has low confidence)
const onlyTrainabilityShown: DogProfilerData = {
  energy_level: "high",
  trainability: "challenging",
  confidence_scores: {
    energy_level: 0.3, // Too low, won't show
    trainability: 0.85,
  },
};

// Example 4: Nothing shown (both have low confidence)
const nothingShown: DogProfilerData = {
  energy_level: "low",
  trainability: "easy",
  confidence_scores: {
    energy_level: 0.2,
    trainability: 0.3,
  },
};

export function EnergyTrainabilityExamples() {
  return (
    <div className="max-w-md mx-auto space-y-8 p-4">
      <div>
        <h3 className="text-lg font-semibold mb-4">Example 1: Both Shown</h3>
        <EnergyTrainability profilerData={highEnergyEasyTrain} />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Example 2: Only Energy</h3>
        <EnergyTrainability profilerData={onlyEnergyShown} />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">
          Example 3: Only Trainability
        </h3>
        <EnergyTrainability profilerData={onlyTrainabilityShown} />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Example 4: Nothing Shown</h3>
        <EnergyTrainability profilerData={nothingShown} />
        <p className="text-sm text-gray-500 mt-2">
          No progress bars shown due to low confidence scores
        </p>
      </div>
    </div>
  );
}

// Usage in a dog detail page:
/*
import { EnergyTrainability } from '../components/dogs/detail';

function DogDetailPage({ dog }) {
  return (
    <div>
      <EnergyTrainability profilerData={dog.dog_profiler_data} />
    </div>
  );
}
*/
