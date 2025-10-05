import type { Guide } from "@/types/guide";

interface GuideSchemaProps {
  guide: Guide;
}

export function GuideSchema({ guide }: GuideSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.frontmatter.title,
    description: guide.frontmatter.description,
    image: guide.frontmatter.heroImage,
    datePublished: guide.frontmatter.lastUpdated,
    dateModified: guide.frontmatter.lastUpdated,
    author: {
      "@type": "Organization",
      name: guide.frontmatter.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Rescue Dog Aggregator",
      logo: {
        "@type": "ImageObject",
        url: "https://rescuedogs.me/logo.jpeg",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://rescuedogs.me/guides/${guide.slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
