import type { MDXRemoteSerializeResult } from "next-mdx-remote";

export interface GuideFrontmatter {
  title: string;
  slug: string;
  description: string;
  heroImage: string;
  heroImageAlt?: string;
  readTime: number;
  category: string;
  keywords: string[];
  lastUpdated: string;
  author: string;
  relatedGuides: string[];
}

export interface Guide {
  slug: string;
  frontmatter: GuideFrontmatter;
  content: string;
  serializedContent?: MDXRemoteSerializeResult;
}
