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
  return {
    title: `${guide.frontmatter.title} | Rescue Dog Aggregator`,
    description: guide.frontmatter.description,
    openGraph: {
      title: guide.frontmatter.title,
      description: guide.frontmatter.description,
      images: [guide.frontmatter.heroImage],
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
