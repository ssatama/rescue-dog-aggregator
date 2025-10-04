'use client';

import { MDXRemote } from 'next-mdx-remote';
import Image from 'next/image';
import { Guide } from '@/types/guide';
import { DogGrid } from './DogGrid';
import { Callout } from './Callout';
import { Stats } from './Stats';

interface GuideContentProps {
  guide: Guide;
  fullPage?: boolean;
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

export function GuideContent({ guide, fullPage = false }: GuideContentProps) {
  const { frontmatter, serializedContent } = guide;

  return (
    <article className={fullPage ? "container mx-auto px-4 py-12 max-w-4xl" : "px-8 py-6"}>
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
        dark:prose-a:text-orange-400">
        {serializedContent && <MDXRemote {...serializedContent} components={components} />}
      </div>

      {/* Related Guides */}
      {frontmatter.relatedGuides?.length > 0 && (
        <footer className="mt-12 pt-8 border-t">
          <h3 className="text-2xl font-bold mb-4">Related Guides</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TODO: Render related guide cards */}
          </div>
        </footer>
      )}
    </article>
  );
}
