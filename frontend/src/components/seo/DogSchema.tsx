/**
 * Dog Schema.org Component
 * Generates Product schema with Dog additionalType for individual dog pages
 * Following SEO roadmap requirements for enhanced search appearance
 */

import React from "react";
import { generatePetSchema, generateJsonLdScript } from "../../utils/schema";

interface Organization {
  id?: string | number;
  name: string;
  website_url?: string;
  city?: string;
  country?: string;
  adoption_fees?: {
    usual_fee: number;
    currency: string;
  };
}

interface DogData {
  id: string | number;
  name: string;
  breed?: string;
  standardized_breed?: string;
  sex?: string;
  age_text?: string;
  description?: string;
  primary_image_url?: string;
  properties?: {
    description?: string;
  };
  organization?: Organization;
}

interface DogSchemaProps {
  dog: DogData;
}

/**
 * Dog Schema Component - Injects JSON-LD structured data for dog listings
 * Uses Product schema with Dog additionalType for better search visibility
 *
 * @param dog - Dog data object from API
 */
export const DogSchema: React.FC<DogSchemaProps> = ({ dog }) => {
  if (!dog || !dog.name) {
    return null;
  }

  const schema = generatePetSchema(dog);

  if (!schema) {
    return null;
  }

  const jsonLdScript = generateJsonLdScript(schema);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdScript }}
    />
  );
};

export default DogSchema;
