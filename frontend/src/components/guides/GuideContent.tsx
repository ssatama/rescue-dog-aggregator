'use client';

import { MDXRemote } from 'next-mdx-remote';
import { Guide } from '@/types/guide';
import { DogGrid } from './DogGrid';

interface GuideContentProps {
  guide: Guide;
}

const components = {
  DogGrid,
};

export function GuideContent({ guide }: GuideContentProps) {
  return (
    <article className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">{guide.frontmatter.title}</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        {guide.frontmatter.description}
      </p>
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <MDXRemote {...guide.serializedContent} components={components} />
      </div>
    </article>
  );
}
