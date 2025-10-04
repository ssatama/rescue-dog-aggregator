import { getGuide } from '@/lib/guides';
import { GuideContent } from '@/components/guides/GuideContent';
import { GuideOverlay } from '@/components/guides/GuideOverlay';

export default async function GuideModal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await getGuide(slug);

  return (
    <GuideOverlay>
      <GuideContent guide={guide} />
    </GuideOverlay>
  );
}
