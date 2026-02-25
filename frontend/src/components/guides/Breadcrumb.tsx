"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbProps {
  guideName: string;
}

export function Breadcrumb({ guideName }: BreadcrumbProps) {
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Guides", href: "/guides" },
    { label: guideName, href: null },
  ];

  // BreadcrumbList structured data for SEO
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href && { item: `https://www.rescuedogs.me${item.href}` }),
    })),
  };

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <li key={item.label} className="flex items-center gap-2">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-orange-500 hover:text-orange-600 hover:underline transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className="text-gray-600 dark:text-guide-text-secondary"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                )}

                {!isLast && (
                  <ChevronRight
                    className="h-4 w-4 text-gray-400 dark:text-gray-600"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
