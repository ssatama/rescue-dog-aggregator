import type { GuideSummary } from "@/types/guide";
import { GuideCard } from "./GuideCard";

interface RelatedGuidesProps {
  relatedGuides: GuideSummary[];
}

export function RelatedGuides({ relatedGuides }: RelatedGuidesProps) {
  if (!relatedGuides || relatedGuides.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="related-guides" className="mt-12 border-t border-line pt-8">
      <h2 id="related-guides" className="mb-4 font-display text-2xl font-bold text-ink">
        Related guides
      </h2>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {relatedGuides.map((guide) => (
          <li key={guide.slug}>
            <GuideCard guide={guide} />
          </li>
        ))}
      </ul>
    </section>
  );
}
