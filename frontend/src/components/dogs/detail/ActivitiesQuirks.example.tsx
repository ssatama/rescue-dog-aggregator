import React from "react";
import ActivitiesQuirks from "./ActivitiesQuirks";
import { DogProfilerData } from "../../../types/dogProfiler";

/**
 * Example usage of ActivitiesQuirks component
 * This demonstrates how to use the component with different data scenarios
 */

export default function ActivitiesQuirksExample() {
  const exampleData: DogProfilerData = {
    favorite_activities: ["running", "swimming", "playing", "cuddling", "walking"],
    unique_quirk: "Loves to carry his favorite squeaky toy everywhere and won't eat dinner without it nearby!",
    confidence_scores: {
      favorite_activities: 0.85,
      unique_quirk: 0.92
    }
  };

  const activitiesOnlyData: DogProfilerData = {
    favorite_activities: ["fetch", "zooming", "rolling"],
    unique_quirk: "",
    confidence_scores: {
      favorite_activities: 0.75,
      unique_quirk: 0.3 // Below threshold
    }
  };

  const quirkOnlyData: DogProfilerData = {
    favorite_activities: [],
    unique_quirk: "Has learned to open doors and will escape to find the mailman every day at 3 PM",
    confidence_scores: {
      favorite_activities: 0.4, // Below threshold
      unique_quirk: 0.88
    }
  };

  const lowConfidenceData: DogProfilerData = {
    favorite_activities: ["running", "swimming"],
    unique_quirk: "Loves belly rubs",
    confidence_scores: {
      favorite_activities: 0.3,
      unique_quirk: 0.2
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        ActivitiesQuirks Component Examples
      </h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Both Activities and Quirk (High Confidence)
          </h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <ActivitiesQuirks profilerData={exampleData} />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Activities Only
          </h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <ActivitiesQuirks profilerData={activitiesOnlyData} />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Quirk Only
          </h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <ActivitiesQuirks profilerData={quirkOnlyData} />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Low Confidence (Nothing Shows)
          </h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border min-h-[100px] flex items-center justify-center text-gray-500">
            <ActivitiesQuirks profilerData={lowConfidenceData} />
            <span className="italic">Component returns null when confidence scores are too low</span>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            No Data
          </h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border min-h-[100px] flex items-center justify-center text-gray-500">
            <ActivitiesQuirks profilerData={null} />
            <span className="italic">Component returns null when no data is provided</span>
          </div>
        </section>
      </div>

      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          Usage Notes:
        </h3>
        <ul className="text-blue-800 space-y-2 text-sm">
          <li>• Only shows activities when confidence_scores.favorite_activities &gt; 0.5</li>
          <li>• Only shows quirk when confidence_scores.unique_quirk &gt; 0.5</li>
          <li>• Activities display with relevant emojis (🏃 running, 🏊 swimming, 🎾 playing, etc.)</li>
          <li>• Component returns null if no sections meet confidence requirements</li>
          <li>• Colors rotate through engaging Tailwind palette for activities</li>
          <li>• Pure functions ensure no side effects or mutations</li>
        </ul>
      </div>
    </div>
  );
}