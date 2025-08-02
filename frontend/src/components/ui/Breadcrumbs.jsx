/**
 * Breadcrumb navigation component with SEO-optimized structured data
 * Uses existing schema utilities for proper JSON-LD generation
 */

import React from "react";
import Link from "next/link";
import { generateBreadcrumbSchema } from "../../utils/schema";

/**
 * Breadcrumbs component with structured data support
 * @param {Object} props - Component props
 * @param {Array} props.items - Array of breadcrumb items {name, url?}
 * @returns {JSX.Element|null} Breadcrumb navigation or null if no items
 */
export default function Breadcrumbs({ items }) {
  // Don't render if no items or empty array
  if (!items || !Array.isArray(items) || items.length === 0) {
    return null;
  }

  // Generate structured data using existing schema utility
  const breadcrumbSchema = generateBreadcrumbSchema({ items });

  return (
    <>
      {/* JSON-LD structured data for SEO */}
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      )}

      {/* Breadcrumb navigation */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol
          className="flex items-center space-x-2 text-sm text-gray-600"
          role="list"
        >
          {items.map((item, index) => (
            <li key={index} className="flex items-center" role="listitem">
              {/* Add separator before all items except the first */}
              {index > 0 && (
                <span className="mx-2 text-gray-400" aria-hidden="true">
                  /
                </span>
              )}

              {/* Render as link if URL provided, otherwise as span */}
              {item.url ? (
                <Link
                  href={item.url}
                  className="hover:text-orange-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 rounded"
                >
                  {item.name}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium">{item.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
