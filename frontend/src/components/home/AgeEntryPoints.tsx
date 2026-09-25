import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatCount } from "@/utils/formatCount";

interface AgeEntryPointsProps {
  /** Dogs with a known age only: these pages promise one. */
  puppies: number;
  seniors: number;
}

export default function AgeEntryPoints({ puppies, seniors }: AgeEntryPointsProps): React.JSX.Element | null {
  const entries = [
    { title: "Puppies", note: "Under a year old", count: puppies, href: "/dogs/puppies" },
    { title: "Seniors", note: "Calm company, often overlooked", count: seniors, href: "/dogs/senior" },
  ].filter((entry) => entry.count > 0);
  if (entries.length === 0) return null;

  return (
    <nav aria-label="Browse by age" className="grid gap-3 sm:grid-cols-2 sm:gap-4">
      {entries.map((entry) => (
        <Link
          key={entry.href}
          href={entry.href}
          className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-bold text-ink sm:text-xl">{entry.title}</span>
            <span className="block text-sm text-subtle">
              {formatCount(entry.count)} dogs · {entry.note}
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}
