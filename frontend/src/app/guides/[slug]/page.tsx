import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import { getGuide, getAllGuideSlugs, getAllGuides } from "@/lib/guides";
import { mdxComponents } from "@/components/guides/mdxComponents";
import { GuideContent } from "@/components/guides/GuideContent";
import { GuideSchema } from "@/components/guides/GuideSchema";
import { ReadingProgress } from "@/components/guides/ReadingProgress";
import { BreadcrumbSchema } from "@/components/seo";
import Layout from "@/components/layout/Layout";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { GuideSummary } from "@/types/guide";

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

  if (!guide) {
    return {
      title: "Guide Not Found | Rescue Dog Aggregator",
      description:
        "The requested guide could not be found. Browse our rescue adoption guides.",
    };
  }

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
      publishedTime: frontmatter.datePublished,
      modifiedTime: frontmatter.lastUpdated,
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

  const guide = await getGuide(slug);

  if (!guide) {
    notFound();
  }

  let relatedGuides: GuideSummary[] = [];
  if (
    guide.frontmatter.relatedGuides &&
    guide.frontmatter.relatedGuides.length > 0
  ) {
    const allGuides = await getAllGuides();
    relatedGuides = allGuides
      .filter((g) => guide.frontmatter.relatedGuides?.includes(g.slug))
      // Drop the body: RelatedGuides renders cards from frontmatter alone, and
      // these cross the client boundary.
      .map(({ slug: relatedSlug, frontmatter }) => ({ slug: relatedSlug, frontmatter }));
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
        guide={{ slug: guide.slug, frontmatter: guide.frontmatter }}
        fullPage={true}
        relatedGuides={relatedGuides}
      >
        {/* Rendered here, on the server, so the guide body is in the static
            HTML. It used to be loaded with dynamic(..., { ssr: false }), which
            left the prerendered page with a title and a hero image and put
            every heading and paragraph in the client payload only. */}
        <MDXRemote
          source={guide.content}
          components={mdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [
                rehypeSlug,
                [rehypeAutolinkHeadings, { behavior: "wrap" }],
                rehypeHighlight,
              ],
            },
          }}
        />
      </GuideContent>
    </Layout>
  );
}
