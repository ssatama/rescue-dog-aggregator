export interface GuideFrontmatter {
  title: string;
  slug: string;
  description: string;
  /** Search-result title (≤65 chars) when `title` is too long for one (#444) */
  seoTitle?: string;
  /** Search-result description (≤160 chars) when `description` is too long for one */
  seoDescription?: string;
  heroImage: string;
  heroImageAlt?: string;
  readTime: number;
  category: string;
  keywords: string[];
  lastUpdated: string;
  datePublished?: string;
  author: string;
  relatedGuides: string[];
}

export interface Guide {
  slug: string;
  frontmatter: GuideFrontmatter;
  content: string;
}

/**
 * What the client components actually read. The route renders the body itself,
 * so passing a whole Guide across the boundary serialises 18-40KB of raw MDX
 * per guide into the RSC payload that nothing reads.
 */
export type GuideSummary = Pick<Guide, "slug" | "frontmatter">;
