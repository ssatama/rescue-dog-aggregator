import { getAllGuides } from '@/lib/guides';
import { GuideCard } from './GuideCard';

interface RelatedGuidesProps {
  relatedSlugs: string[];
}

export async function RelatedGuides({ relatedSlugs }: RelatedGuidesProps) {
  if (!relatedSlugs || relatedSlugs.length === 0) {
    return null;
  }

  const allGuides = await getAllGuides();
  const relatedGuides = allGuides.filter(guide => relatedSlugs.includes(guide.slug));

  if (relatedGuides.length === 0) {
    return null;
  }

  return (
    <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-guide-dark-border">
      <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Related Guides</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {relatedGuides.map(guide => (
          <GuideCard key={guide.slug} guide={guide} />
        ))}
      </div>
    </footer>
  );
}
