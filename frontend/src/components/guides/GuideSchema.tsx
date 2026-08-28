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
    image: guide.frontmatter.heroImage,
    ...(datePublished ? { datePublished } : {}),
    dateModified: guide.frontmatter.lastUpdated,
    author: {
      "@type": "Person",
      name: guide.frontmatter.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Rescue Dog Aggregator",
      logo: {
        "@type": "ImageObject",
        url: "https://www.rescuedogs.me/logo.jpeg",
      },
    },
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
