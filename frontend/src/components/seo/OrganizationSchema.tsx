/**
 * Organization Schema.org Component
 * Generates Organization schema for rescue organization pages
 * Combines LocalBusiness and AnimalShelter types for comprehensive coverage
 */

import React from "react";
import {
  generateOrganizationSchema,
  generateJsonLdScript,
} from "../../utils/schema";

interface OrganizationData {
  id: string | number;
  name: string;
  description?: string;
  website_url?: string;
  city?: string;
  country?: string;
  logo_url?: string;
  total_dogs?: number;
  established_year?: number;
}

interface OrganizationSchemaProps {
  organization: OrganizationData;
}

/**
 * Organization Schema Component - Injects JSON-LD structured data for organization pages
 * Uses LocalBusiness and AnimalShelter types for enhanced local search visibility
 *
 * @param organization - Organization data object from API
 */
export const OrganizationSchema: React.FC<OrganizationSchemaProps> = ({
  organization,
}) => {
  if (!organization || !organization.name) {
    return null;
  }

  const schema = generateOrganizationSchema(organization);

  if (!schema) {
    return null;
  }

  const jsonLdScript = generateJsonLdScript(schema).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdScript }}
    />
  );
};

export default OrganizationSchema;
