import { getAllGuides } from '@/lib/guides';
import { GuideCard } from '@/components/guides/GuideCard';
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
        {guides.map((guide, index) => (
          <GuideCard key={guide.slug} guide={guide} priority={index < 4} />
        ))}
      </div>
    </div>
  );
}
