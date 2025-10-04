import { getGuide } from '@/lib/guides';
import { GuideContent } from '@/components/guides/GuideContent';

export default async function GuideModal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await getGuide(slug);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <GuideContent guide={guide} />
      </div>
    </div>
  );
}
