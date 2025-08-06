/**
 * Breadcrumb Schema.org Component
 * Generates BreadcrumbList schema for navigation hierarchy
 * Improves site structure understanding by search engines
 */

import React from "react";
import {
  generateBreadcrumbSchema,
  generateJsonLdScript,
} from "../../utils/schema";

interface BreadcrumbItem {
  name: string;
  url?: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

/**
 * Breadcrumb Schema Component - Injects JSON-LD structured data for navigation hierarchy
 * Helps search engines understand site structure and page relationships
 *
 * @param items - Array of breadcrumb navigation items
 */
export const BreadcrumbSchema: React.FC<BreadcrumbSchemaProps> = ({
  items,
}) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return null;
  }

  const breadcrumbData = { items };
  const schema = generateBreadcrumbSchema(breadcrumbData);

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

export default BreadcrumbSchema;
