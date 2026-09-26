"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { GuideSummary } from "@/types/guide";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { formatGuideDate, guideCategoryLabel } from "@/lib/guideLabels";
import { TableOfContents, InlineContents, type TOCSection } from "./TableOfContents";
import { RelatedGuides } from "./RelatedGuides";
import { GuideDogStrip } from "./GuideDogStrip";

interface GuideContentProps {
  guide: GuideSummary;
  relatedGuides?: GuideSummary[];
  /** MDX body, rendered on the server by the route. */
  children?: ReactNode;
}

const DOGS_LINK =
  "inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-orange-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-orange-400";

/**
 * A guide (#503): what it covers, real dogs listed now and a link into the
 * matching catalog view, its contents, the body, and related guides.
 */
export function GuideContent({ guide, relatedGuides = [], children }: GuideContentProps) {
  const { frontmatter, dogs = [] } = guide;
  const [sections, setSections] = useState<TOCSection[]>([]);

  // The body is server-rendered, so its headings are in the document already
  useEffect(() => {
    const headings = document.querySelectorAll("article [data-guide-body] h2");
    setSections(Array.from(headings).map((h) => ({ id: h.id, title: h.textContent || "" })));
  }, [guide.slug]);

  return (
    <div className="mx-auto max-w-7xl py-6 lg:py-8">
      <div className="flex gap-10">
        {sections.length > 0 && <TableOfContents sections={sections} />}

        <article className="min-w-0 max-w-3xl flex-1">
          {/* The route's BreadcrumbSchema is this page's BreadcrumbList */}
          <Breadcrumbs
            items={[{ name: "Home", url: "/" }, { name: "Guides", url: "/guides" }, { name: frontmatter.title }]}
            schema={false}
          />

          <header className="grid gap-3">
            <p className="text-sm font-semibold text-subtle">{guideCategoryLabel(frontmatter.category)}</p>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl lg:text-5xl">
              {frontmatter.title}
            </h1>
            <p className="text-lg text-subtle">{frontmatter.description}</p>
            <p className="text-sm text-subtle">
              {frontmatter.readTime} min read ·{" "}
              <time dateTime={frontmatter.lastUpdated}>Updated {formatGuideDate(frontmatter.lastUpdated)}</time> ·{" "}
              {frontmatter.author}
            </p>
          </header>

          {(dogs.length > 0 || frontmatter.dogs) && (
            <div className="mt-6 grid gap-3">
              <GuideDogStrip dogs={dogs} linked className="max-w-md" />
              {frontmatter.dogs && (
                <Link href={frontmatter.dogs.href} className={DOGS_LINK}>
                  {frontmatter.dogs.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </div>
          )}

          {sections.length > 0 && (
            <div className="mt-6">
              <InlineContents sections={sections} />
            </div>
          )}

          <div
            data-guide-body
            className="prose prose-lg mt-8 max-w-none text-ink dark:prose-invert prose-headings:font-display prose-headings:text-ink prose-strong:text-ink [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24"
          >
            {children}
          </div>

          {frontmatter.dogs && (
            <div className="mt-10 rounded-xl border border-line bg-surface p-5">
              <p className="font-display text-lg font-bold text-ink">Ready to look?</p>
              <Link href={frontmatter.dogs.href} className={`mt-2 ${DOGS_LINK}`}>
                {frontmatter.dogs.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}

          {relatedGuides.length > 0 && <RelatedGuides relatedGuides={relatedGuides} />}
        </article>
      </div>
    </div>
  );
}
