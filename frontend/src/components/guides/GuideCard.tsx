import Link from "next/link";
import type { GuideSummary } from "@/types/guide";
import { formatGuideDate, guideCategoryLabel } from "@/lib/guideLabels";
import { GuideDogStrip } from "./GuideDogStrip";

interface GuideCardProps {
  guide: GuideSummary;
}

/** A guide on the index or under "Related guides" (#503): real dogs, what it covers, how long it takes. */
export function GuideCard({ guide }: GuideCardProps) {
  const { slug, frontmatter, dogs = [] } = guide;

  return (
    <article className="group relative flex h-full flex-col gap-4 rounded-xl border border-line bg-surface p-4 transition-shadow hover:shadow-card focus-within:ring-2 focus-within:ring-ring sm:p-5">
      <GuideDogStrip dogs={dogs} />
      <div className="grid gap-1.5">
        <p className="text-sm font-semibold text-subtle">{guideCategoryLabel(frontmatter.category)}</p>
        <h2 className="font-display text-xl font-bold leading-tight text-ink">
          {/* The ::after covers the card, so the whole card is one tap target */}
          <Link
            href={`/guides/${slug}`}
            className="after:absolute after:inset-0 after:z-[1] after:content-[''] focus:outline-none"
          >
            {frontmatter.title}
          </Link>
        </h2>
        <p className="line-clamp-3 text-sm text-subtle">{frontmatter.description}</p>
      </div>
      <p className="mt-auto text-sm text-subtle">
        {frontmatter.readTime} min read ·{" "}
        <time dateTime={frontmatter.lastUpdated}>Updated {formatGuideDate(frontmatter.lastUpdated)}</time>
      </p>
    </article>
  );
}
