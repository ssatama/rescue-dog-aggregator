"use client";

import { useMemo } from "react";
import { useActiveSection } from "./hooks/useActiveSection";
import { cn } from "@/lib/utils";

export interface TOCSection {
  id: string;
  title: string;
}

/**
 * A long guide's sections (#503): a sticky sidebar from 1024px that marks the
 * section being read, and a collapsed list at the top of the guide below.
 */
export function TableOfContents({ sections }: { sections: TOCSection[] }) {
  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const activeId = useActiveSection(ids);

  return (
    <aside className="sticky top-24 hidden max-h-[calc(100vh-8rem)] w-60 shrink-0 self-start overflow-y-auto lg:block">
      <h2 className="mb-3 font-display text-base font-bold text-ink">Contents</h2>
      <nav aria-label="Contents">
        <ol className="grid gap-0.5">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={activeId === section.id ? "location" : undefined}
                className={cn(
                  "block rounded-md border-l-2 px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeId === section.id
                    ? "border-orange-600 bg-soft font-semibold text-ink"
                    : "border-transparent text-subtle hover:bg-soft hover:text-ink",
                )}
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}

/** The same list, collapsed, for screens without the sidebar */
export function InlineContents({ sections }: { sections: TOCSection[] }) {
  return (
    <details className="group rounded-xl border border-line bg-surface lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold text-ink">
        Contents
        <span className="text-sm font-normal text-subtle group-open:hidden">{sections.length} sections</span>
      </summary>
      <nav aria-label="Contents" className="border-t border-line px-4 py-3">
        <ol className="grid list-decimal gap-2 pl-5 text-sm">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-ink underline-offset-4 hover:underline">
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}
