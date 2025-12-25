/**
 * Person Schema.org Component
 * Generates Person schema for founder/team member E-E-A-T signals
 * Helps Google understand the people behind the organization
 */

import React from "react";

interface OrganizationRef {
  name: string;
  url: string;
}

interface PersonSchemaProps {
  name: string;
  jobTitle: string;
  organization: OrganizationRef;
  sameAs: string[];
}

/**
 * Person Schema Component - Injects JSON-LD structured data for people
 * Improves E-E-A-T signals by connecting founder/team to the organization
 *
 * @param name - Full name of the person
 * @param jobTitle - Role/title (e.g., "Founder")
 * @param organization - Organization the person works for
 * @param sameAs - Array of social profile URLs
 */
export const PersonSchema: React.FC<PersonSchemaProps> = ({
  name,
  jobTitle,
  organization,
  sameAs,
}) => {
  if (!name || !jobTitle || !organization) {
    return null;
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle,
    worksFor: {
      "@type": "Organization",
      name: organization.name,
      url: organization.url,
    },
    sameAs: sameAs.filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export default PersonSchema;
