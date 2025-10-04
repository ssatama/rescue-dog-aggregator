import { getGuide, getAllGuideSlugs } from '@/lib/guides';
import { GuideContent } from '@/components/guides/GuideContent';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  const slugs = getAllGuideSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
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
      type: 'article',
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
      card: 'summary_large_image',
      title: frontmatter.title,
      description: frontmatter.description,
      images: [frontmatter.heroImage],
    },

    alternates: {
      canonical: `https://rescuedogs.me/guides/${slug}`,
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const guide = await getGuide(slug);
    return <GuideContent guide={guide} />;
  } catch (error) {
    notFound();
  }
}
