import Link from "next/link";
import type { GuideFrontmatter } from "@/types/guide";

export type GuideTeaser = { slug: string } & Pick<GuideFrontmatter, "title" | "description" | "readTime">;

export default function GuidesTeaser({ guides }: { guides: GuideTeaser[] }): React.JSX.Element | null {
  if (guides.length === 0) return null;
  return (
    <section aria-labelledby="home-guides" className="grid gap-3 sm:gap-4">
      <div className="flex items-baseline gap-3">
        <h2 id="home-guides" className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Before you adopt
        </h2>
        <Link href="/guides" className="ml-auto text-sm font-semibold text-primary hover:underline">
          All guides
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/guides/${guide.slug}`}
              className="flex h-full flex-col gap-1 rounded-2xl border border-line bg-surface p-4 transition-colors hover:bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-display text-base font-bold text-ink">{guide.title}</span>
              <span className="line-clamp-2 text-sm text-subtle">{guide.description}</span>
              <span className="mt-auto pt-1 text-xs text-subtle">{guide.readTime} min read</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
