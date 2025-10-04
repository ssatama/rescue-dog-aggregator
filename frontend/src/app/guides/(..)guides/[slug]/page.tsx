import { getGuide, getAllGuides } from '@/lib/guides';
import { GuideContent } from '@/components/guides/GuideContent';
import { GuideOverlay } from '@/components/guides/GuideOverlay';
import { Guide } from '@/types/guide';

export default async function GuideModal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await getGuide(slug);

  // Fetch related guides if specified in frontmatter
  let relatedGuides: Guide[] = [];
  if (guide.frontmatter.relatedGuides && guide.frontmatter.relatedGuides.length > 0) {
    const allGuides = await getAllGuides();
    relatedGuides = allGuides.filter(g => guide.frontmatter.relatedGuides?.includes(g.slug));
  }

  return (
    <GuideOverlay>
      <GuideContent guide={guide} relatedGuides={relatedGuides} />
    </GuideOverlay>
  );
}
