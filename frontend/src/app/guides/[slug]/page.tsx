import { getGuide, getAllGuideSlugs, getAllGuides } from "@/lib/guides";
import { GuideContent } from "@/components/guides/GuideContent";
import { ReadingProgress } from "@/components/guides/ReadingProgress";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Guide } from "@/types/guide";

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
      canonical: `https://rescuedogs.me/guides/${slug}`,
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const guide = await getGuide(slug);

    // Fetch related guides if specified in frontmatter
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
      <>
        <Header />
        <ReadingProgress />
        <GuideContent
          guide={guide}
          fullPage={true}
          relatedGuides={relatedGuides}
        />
        <Footer />
      </>
    );
  } catch (error) {
    notFound();
  }
}
