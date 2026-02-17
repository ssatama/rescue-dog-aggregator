import React, { memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { sanitizeText } from "../../utils/security";
import type { OrganizationSectionProps } from "@/types/organizationComponents";

// Memoized OrganizationSection to prevent re-renders
const OrganizationSection = memo(
  function OrganizationSection({ organization, organizationId }: OrganizationSectionProps) {
    if (!organization) {
      return null;
    }

    const organizationName = sanitizeText(
      organization.name || "Unknown Organization",
    );
    const websiteUrl = organization.website_url;
    const orgId = organizationId || organization.id;

    return (
      <div
        className="border rounded-lg p-6 bg-gray-50 hover:bg-gray-100 transition-all duration-300 hover:shadow-md hover:border-gray-300 group"
        data-testid="organization-section"
      >
        <div className="flex justify-between items-start">
          {/* Left side: Organization info and primary action */}
          <div className="flex-1">
            {/* Header with home icon and label */}
            <div
              className="flex items-center mb-3"
              data-testid="organization-header"
            >
              <div className="text-gray-600 mr-3 p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-all duration-300">
                <svg
                  className="w-5 h-5 group-hover:text-blue-600 transition-colors duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-600 group-hover:text-gray-800 transition-colors duration-300">
                Rescue Organization
              </span>
            </div>

            {/* Organization name */}
            <h3
              className="text-2xl font-semibold text-gray-900 mb-4 group-hover:text-blue-900 transition-colors duration-300"
              data-testid="organization-name"
            >
              {organizationName}
            </h3>

            {/* Primary action link */}
            {orgId && (
              <Link
                href={`/dogs?organization_id=${orgId}`}
                className="text-blue-600 hover:text-blue-800 font-medium transition-all duration-300 inline-flex items-center group/link bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg hover:shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                data-testid="view-all-dogs-link"
              >
                View all dogs from this rescue
                <svg
                  className="w-4 h-4 ml-2 transform group-hover/link:translate-x-1 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            )}
          </div>

          {/* Right side: Enhanced secondary action button */}
          {websiteUrl && (
            <div className="ml-6">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="inline-flex items-center hover:bg-white hover:shadow-md transition-all duration-300 border-gray-300 hover:border-blue-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group/button"
              >
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 font-medium"
                  data-testid="visit-website-button"
                >
                  Visit Website
                  <svg
                    className="w-4 h-4 ml-2 group-hover/button:rotate-12 transition-transform duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps: OrganizationSectionProps, nextProps: OrganizationSectionProps) => {
    // Only re-render if organization data changes
    return (
      prevProps.organizationId === nextProps.organizationId &&
      prevProps.organization?.id === nextProps.organization?.id &&
      prevProps.organization?.name === nextProps.organization?.name &&
      prevProps.organization?.website_url ===
        nextProps.organization?.website_url
    );
  },
);

OrganizationSection.displayName = "OrganizationSection";

export default OrganizationSection;
