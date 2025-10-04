import { getAllGuides } from '@/lib/guides';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Adoption Guides | Rescue Dog Aggregator',
  description: 'Comprehensive guides to adopting rescue dogs from Europe',
};

export default async function GuidesPage() {
  const guides = await getAllGuides();

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Adoption Guides</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {guides.map((guide) => (
          <div key={guide.slug} className="p-6 border rounded-lg">
            <h2 className="text-2xl font-bold">{guide.frontmatter.title}</h2>
            <p className="text-gray-600">{guide.frontmatter.description}</p>
            <p className="text-sm text-gray-500 mt-2">
              {guide.frontmatter.readTime} min read
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
