import { getGuide, getAllGuideSlugs, getAllGuides } from "@/lib/guides";
import { GuideContent } from "@/components/guides/GuideContent";
import { GuideSchema } from "@/components/guides/GuideSchema";
import { ReadingProgress } from "@/components/guides/ReadingProgress";
import { BreadcrumbSchema } from "@/components/seo";
import Layout from "@/components/layout/Layout";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Guide } from "@/types/guide";

// Force static generation for guides (content doesn't change frequently)
export const dynamic = "force-static";

export async function generateStaticParams() {
  const slugs = getAllGuideSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide(slug);
  const { frontmatter } = guide;

  return {
    title: `${frontmatter.title} | Rescue Dog Aggregator`,
    description: frontmatter.description,
    keywords: frontmatter.keywords,
    authors: [{ name: frontmatter.author }],

    openGraph: {
      title: frontmatter.title,
      description: frontmatter.description,
      type: "article",
      publishedTime: frontmatter.lastUpdated,
      authors: [frontmatter.author],
      images: [
        {
          url: frontmatter.heroImage,
          width: 1200,
          height: 630,
          alt: frontmatter.heroImageAlt || frontmatter.title,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: frontmatter.title,
      description: frontmatter.description,
      images: [frontmatter.heroImage],
    },

    alternates: {
      canonical: `https://www.rescuedogs.me/guides/${slug}`,
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let guide;
  try {
    guide = await getGuide(slug);
  } catch {
    notFound();
  }

  let relatedGuides: Guide[] = [];
  if (
    guide.frontmatter.relatedGuides &&
    guide.frontmatter.relatedGuides.length > 0
  ) {
    const allGuides = await getAllGuides();
    relatedGuides = allGuides.filter((g) =>
      guide.frontmatter.relatedGuides?.includes(g.slug),
    );
  }

  return (
    <Layout>
      <GuideSchema guide={guide} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Guides", url: "/guides" },
          { name: guide.frontmatter.title },
        ]}
      />
      <ReadingProgress />
      <GuideContent
        guide={guide}
        fullPage={true}
        relatedGuides={relatedGuides}
      />
    </Layout>
  );
}
