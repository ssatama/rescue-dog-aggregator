import { SITE_NAME, SITE_ORGANIZATION_ID, siteOrganizationRef } from "@/utils/schema";
import type { Guide } from "@/types/guide";

interface GuideSchemaProps {
  guide: Guide;
}

export function GuideSchema({ guide }: GuideSchemaProps) {
  const { datePublished } = guide.frontmatter;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.frontmatter.title,
    description: guide.frontmatter.description,
    image: guide.frontmatter.heroImage.startsWith("/")
      ? `https://www.rescuedogs.me${guide.frontmatter.heroImage}`
      : guide.frontmatter.heroImage,
    ...(datePublished ? { datePublished } : {}),
    dateModified: guide.frontmatter.lastUpdated,
    // Written by the site, not a named person: point at the site Organization (#443)
    author: { "@type": "Organization", "@id": SITE_ORGANIZATION_ID, name: SITE_NAME },
    publisher: siteOrganizationRef,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://www.rescuedogs.me/guides/${guide.slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
    />
  );
}
