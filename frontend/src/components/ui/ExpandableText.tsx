"use client";

import React, { useState, useEffect, useId } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ExpandableTextProps } from "@/types/dogComponents";

export default function ExpandableText({ text, lines = 4, className = "" }: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const textId = useId();

  useEffect(() => {
    const checkScreenSize = () => {
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      setIsDesktop(desktop);
    };

    checkScreenSize();

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    window.addEventListener("resize", checkScreenSize);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  useEffect(() => {
    const checkTruncation = () => {
      if (!text) return;

      const estimatedCharsPerLine = 80;
      const estimatedTotalChars = lines * estimatedCharsPerLine;
      setNeedsTruncation(text.length > estimatedTotalChars);
    };

    checkTruncation();
  }, [text, lines]);

  if (!text) return null;

  const shouldShowButton = !isDesktop && needsTruncation;
  const shouldTruncate = !isDesktop && needsTruncation && !isExpanded;

  return (
    <div className={className}>
      <p
        id={textId}
        data-testid="expandable-text-content"
        className={`text-gray-700 dark:text-gray-300 leading-relaxed text-lg transition-all duration-300 ${
          shouldTruncate ? `line-clamp-${lines}` : ""
        }`}
        aria-expanded={!isDesktop ? isExpanded : undefined}
      >
        {text}
      </p>

      {shouldShowButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 font-medium text-sm transition-colors"
          aria-controls={textId}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <>
              See less
              <ChevronUp className="w-4 h-4" aria-hidden="true" />
            </>
          ) : (
            <>
              See more
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
