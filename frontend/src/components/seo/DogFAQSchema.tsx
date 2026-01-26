/**
 * Dog FAQ Schema.org Component
 * Generates FAQPage schema for individual dog pages using dog_profiler_data
 * Enables rich FAQ results in Google Search and differentiates similar pages
 */

import React from "react";
import type { Dog } from "../../types/dog";
import { generateFAQSchema } from "../../utils/faqSchema";

interface DogFAQSchemaProps {
  dog: Pick<Dog, "name" | "dog_profiler_data">;
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

  // Escape < to prevent script tag injection (defense-in-depth for JSON-LD)
  const jsonLd = JSON.stringify(schema, null, 2).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd }}
    />
  );
};

export default DogFAQSchema;
