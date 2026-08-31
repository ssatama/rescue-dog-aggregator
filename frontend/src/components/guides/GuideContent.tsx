"use client";

import { useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import type { GuideSummary } from "@/types/guide";
import { TableOfContents } from "./TableOfContents";
import { RelatedGuides } from "./RelatedGuides";
import { FontSizeProvider } from "@/contexts/FontSizeContext";
import { FontSizeControl } from "./FontSizeControl";
import { Breadcrumb } from "./Breadcrumb";

interface GuideContentProps {
  guide: GuideSummary;
  fullPage?: boolean;
  relatedGuides?: GuideSummary[];
  /** MDX body, rendered on the server by the route. */
  children?: ReactNode;
}

interface TOCSection {
  id: string;
  title: string;
  level: number;
}


export function GuideContent({
  guide,
  fullPage = false,
  relatedGuides = [],
  children,
}: GuideContentProps) {
  const { frontmatter } = guide;
  const [sections, setSections] = useState<TOCSection[]>([]);
  const [readingProgress, setReadingProgress] = useState(0);

  // Extract H2 sections after MDX renders
  useEffect(() => {
    const extractSections = () => {
      const headings = document.querySelectorAll("article h2");
      const extracted = Array.from(headings).map((h) => ({
        id: h.id,
        title: h.textContent || "",
        level: 2,
      }));
      setSections(extracted);
    };

    // The body is server-rendered, so the headings are already in the document.
    // This used to wait 100ms for the client-side MDX bundle.
    extractSections();
  }, [guide]);

  // Calculate reading progress on scroll
  useEffect(() => {
    const calculateProgress = () => {
      const article = document.querySelector("article");
      if (!article) return;

      const articleTop = article.offsetTop;
      const articleHeight = article.scrollHeight;
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;

      const progress = Math.min(
        100,
        Math.max(
          0,
          ((scrollPosition - articleTop + windowHeight) / articleHeight) * 100,
        ),
      );

      setReadingProgress(progress);
    };

    window.addEventListener("scroll", calculateProgress);
    calculateProgress(); // Initial calculation

    return () => window.removeEventListener("scroll", calculateProgress);
  }, []);

  return (
    <FontSizeProvider>
      {fullPage && <FontSizeControl />}
      <div className={fullPage ? "container mx-auto px-4 py-12" : "px-8 py-6"}>
        <div className="flex gap-8 max-w-7xl mx-auto">
          {/* Desktop TOC Sidebar */}
          {fullPage && sections.length > 0 && (
            <TableOfContents
              sections={sections}
              readingProgress={readingProgress}
            />
          )}

          {/* Main Content */}
          <article className="flex-1 max-w-4xl">
            {/* Breadcrumb Navigation */}
            {fullPage && <Breadcrumb guideName={frontmatter.title} />}

            {/* Hero Image */}
            <div className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden mb-8">
              <Image
                src={frontmatter.heroImage}
                alt={frontmatter.heroImageAlt || frontmatter.title}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Title and Meta */}
            <header className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {frontmatter.title}
              </h1>
              <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                <span>{frontmatter.readTime} min read</span>
                <span>•</span>
                <span>Updated {frontmatter.lastUpdated}</span>
                <span>•</span>
                <span>{frontmatter.author}</span>
              </div>
            </header>

            {/* MDX Content */}
            <div
              className="prose prose-lg dark:prose-invert max-w-none
              dark:prose-headings:text-gray-100
              dark:prose-p:text-gray-300
              dark:prose-a:text-orange-400"
              style={{ fontSize: "var(--guide-font-size, 16px)" }}
            >
              {children}
            </div>

            {/* Related Guides */}
            {relatedGuides.length > 0 && (
              <RelatedGuides relatedGuides={relatedGuides} />
            )}
          </article>
        </div>
      </div>
    </FontSizeProvider>
  );
}
