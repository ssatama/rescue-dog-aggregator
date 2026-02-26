"use client";

import React, { useState, useMemo, useId } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ExpandableTextProps } from "@/types/uiComponents";

export default function ExpandableText({ text, lines = 4, className = "" }: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const textId = useId();

  const needsTruncation = useMemo(() => {
    if (!text) return false;
    const estimatedCharsPerLine = 80;
    const estimatedTotalChars = lines * estimatedCharsPerLine;
    return text.length > estimatedTotalChars;
  }, [text, lines]);

  if (!text) return null;

  const shouldShowButton = needsTruncation;
  const shouldTruncate = needsTruncation && !isExpanded;

  return (
    <div className={className}>
      <p
        id={textId}
        data-testid="expandable-text-content"
        className={`text-gray-700 dark:text-gray-300 leading-relaxed text-lg transition-all duration-300 ${
          shouldTruncate ? `line-clamp-${lines}` : ""
        }`}
        aria-expanded={needsTruncation ? isExpanded : undefined}
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
