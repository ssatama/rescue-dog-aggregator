/**
 * Dog FAQ Schema.org Component
 * Generates FAQPage schema for individual dog pages using dog_profiler_data
 * Enables rich FAQ results in Google Search and differentiates similar pages
 */

import React from "react";
import { generateFAQSchema } from "../../utils/faqSchema";

interface DogProfilerData {
  good_with_children?: "yes" | "no" | "maybe" | "unknown";
  good_with_dogs?: "yes" | "no" | "maybe" | "unknown";
  good_with_cats?: "yes" | "no" | "maybe" | "unknown";
  energy_level?: "low" | "medium" | "high" | "very_high";
  experience_level?: "first_time_ok" | "some_experience" | "experienced_only";
  home_type?: "apartment_ok" | "house_preferred" | "house_required";
  exercise_needs?: "minimal" | "moderate" | "high";
}

interface DogData {
  name: string;
  dog_profiler_data?: DogProfilerData;
}

interface DogFAQSchemaProps {
  dog: DogData;
}

/**
 * Dog FAQ Schema Component - Injects FAQPage JSON-LD structured data
 * Uses dog_profiler_data fields to generate unique FAQ content per dog
 */
export const DogFAQSchema: React.FC<DogFAQSchemaProps> = ({ dog }) => {
  if (!dog?.name || !dog?.dog_profiler_data) {
    return null;
  }

  const schema = generateFAQSchema(dog);

  if (!schema) {
    return null;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
};

export default DogFAQSchema;
