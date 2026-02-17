import React from "react";
import Link from "next/link";
import type { BreadcrumbsProps } from "@/types/uiComponents";
import { generateBreadcrumbSchema } from "../../utils/schema";

export default function Breadcrumbs({ items }: BreadcrumbsProps): React.ReactElement | null {
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
          className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400"
          role="list"
        >
          {items.map((item, index) => (
            <li key={index} className="flex items-center" role="listitem">
              {/* Add separator before all items except the first */}
              {index > 0 && (
                <span
                  className="mx-2 text-gray-400 dark:text-gray-500"
                  aria-hidden="true"
                >
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
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  {item.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
