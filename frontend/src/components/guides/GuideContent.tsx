'use client';

import { useState, useEffect } from 'react';
import { MDXRemote } from 'next-mdx-remote';
import Image from 'next/image';
import { Guide } from '@/types/guide';
import { DogGrid } from './DogGrid';
import { Callout } from './Callout';
import { Stats } from './Stats';
import { GuideSchema } from './GuideSchema';
import { TableOfContents } from './TableOfContents';
import { ReadingProgress } from './ReadingProgress';
import { RelatedGuides } from './RelatedGuides';
import { FontSizeProvider } from '@/contexts/FontSizeContext';
import { FontSizeControl } from './FontSizeControl';

interface GuideContentProps {
  guide: Guide;
  fullPage?: boolean;
  relatedGuides?: Guide[];
}

interface TOCSection {
  id: string;
  title: string;
  level: number;
}

const components = {
  h2: ({ children, ...props }: any) => {
    const id = children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return <h2 id={id} className="text-3xl font-bold mt-8 mb-4" {...props}>{children}</h2>;
  },

  DogGrid,
  Callout,
  Stats,

  p: (props: any) => <p className="mb-4 leading-relaxed" {...props} />,
  ul: (props: any) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
  a: (props: any) => <a className="text-orange-500 hover:underline" {...props} />,
  code: (props: any) => <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded" {...props} />,
};

export function GuideContent({ guide, fullPage = false, relatedGuides = [] }: GuideContentProps) {
  const { frontmatter, serializedContent } = guide;
  const [sections, setSections] = useState<TOCSection[]>([]);
  const [readingProgress, setReadingProgress] = useState(0);

  // Extract H2 sections after MDX renders
  useEffect(() => {
    const extractSections = () => {
      const headings = document.querySelectorAll('article h2');
      const extracted = Array.from(headings).map(h => ({
        id: h.id,
        title: h.textContent || '',
        level: 2,
      }));
      setSections(extracted);
    };

    // Wait for MDX to render, then extract sections
    const timer = setTimeout(extractSections, 100);
    return () => clearTimeout(timer);
  }, [guide]);

  // Calculate reading progress on scroll
  useEffect(() => {
    const calculateProgress = () => {
      const article = document.querySelector('article');
      if (!article) return;

      const articleTop = article.offsetTop;
      const articleHeight = article.scrollHeight;
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;

      const progress = Math.min(
        100,
        Math.max(0, ((scrollPosition - articleTop + windowHeight) / articleHeight) * 100)
      );

      setReadingProgress(progress);
    };

    window.addEventListener('scroll', calculateProgress);
    calculateProgress(); // Initial calculation

    return () => window.removeEventListener('scroll', calculateProgress);
  }, []);

  return (
    <FontSizeProvider>
      <ReadingProgress />
      <GuideSchema guide={guide} />
      {fullPage && <FontSizeControl />}
      <div className={fullPage ? "container mx-auto px-4 py-12" : "px-8 py-6"}>
        <div className="flex gap-8 max-w-7xl mx-auto">
          {/* Desktop TOC Sidebar */}
          {fullPage && sections.length > 0 && (
            <TableOfContents sections={sections} readingProgress={readingProgress} />
          )}

          {/* Main Content */}
          <article className="flex-1 max-w-4xl">
            {/* Hero Image */}
            <div className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden mb-8">
              <Image
                src={frontmatter.heroImage}
                alt={frontmatter.heroImageAlt || frontmatter.title}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Title and Meta */}
            <header className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{frontmatter.title}</h1>
              <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                <span>{frontmatter.readTime} min read</span>
                <span>•</span>
                <span>Updated {frontmatter.lastUpdated}</span>
                <span>•</span>
                <span>{frontmatter.author}</span>
              </div>
            </header>

            {/* MDX Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none
              dark:prose-headings:text-gray-100
              dark:prose-p:text-gray-300
              dark:prose-a:text-orange-400"
              style={{ fontSize: 'var(--guide-font-size, 16px)' }}>
              {serializedContent && <MDXRemote {...serializedContent} components={components} />}
            </div>

            {/* Related Guides */}
            {relatedGuides.length > 0 && (
              <RelatedGuides relatedGuides={relatedGuides} />
            )}
          </article>
        </div>
      </div>
    </FontSizeProvider>
  );
}
