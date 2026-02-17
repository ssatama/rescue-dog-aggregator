import React, { useState, useMemo, useCallback } from "react";
import { sanitizeText, sanitizeHtml } from "../../utils/security";
import type { DogDescriptionProps } from "@/types/dogComponents";

export default function DogDescription({
  description = "",
  dogName = "",
  organizationName = "",
  className = "",
}: DogDescriptionProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPlainTextLength = useCallback((htmlString: string): number => {
    if (!htmlString || typeof htmlString !== "string") return 0;
    if (typeof window === "undefined") {
      return htmlString.replace(/<[^>]*>/g, "").length;
    }

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlString;
    return (tempDiv.textContent || tempDiv.innerText || "").length;
  }, []);

  const descriptionMeta = useMemo(() => {
    const cleanDescription = description?.trim() || "";
    const plainTextLength = getPlainTextLength(cleanDescription);

    return {
      isEmpty: !cleanDescription,
      isShort: plainTextLength > 0 && plainTextLength < 50,
      isLong: plainTextLength > 200,
      plainTextLength,
      cleanDescription,
    };
  }, [description, getPlainTextLength]);

  const enhancedContent = useMemo(() => {
    if (!descriptionMeta.isShort) return null;

    const safeDogName = sanitizeText(dogName || "this dog");
    const safeOrgName = sanitizeText(
      organizationName || "the rescue organization",
    );

    return `Want to learn more about ${safeDogName}? Contact ${safeOrgName} for more details about personality, needs, and adoption requirements.`;
  }, [descriptionMeta.isShort, dogName, organizationName]);

  const fallbackContent = useMemo(() => {
    if (!descriptionMeta.isEmpty) return null;

    const safeDogName = sanitizeText(dogName || "This dog");
    const safeOrgName = sanitizeText(
      organizationName || "the rescue organization",
    );

    return `${safeDogName} is looking for a loving forever home. Contact ${safeOrgName} to learn more about this wonderful dog's personality, needs, and how you can provide the perfect home.`;
  }, [descriptionMeta.isEmpty, dogName, organizationName]);

  const truncatedDescription = useMemo(() => {
    if (!descriptionMeta.isLong) return descriptionMeta.cleanDescription;

    const plainTextLength = getPlainTextLength(
      descriptionMeta.cleanDescription,
    );
    if (plainTextLength <= 200) return descriptionMeta.cleanDescription;

    if (typeof window === "undefined") {
      const plainText = descriptionMeta.cleanDescription.replace(
        /<[^>]*>/g,
        "",
      );
      const truncated = plainText.substring(0, 200);
      const lastSpace = truncated.lastIndexOf(" ");
      const breakPoint = lastSpace > 150 ? lastSpace : 200;
      return plainText.substring(0, breakPoint) + "...";
    }

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = descriptionMeta.cleanDescription;
    const textContent = tempDiv.textContent || tempDiv.innerText || "";

    const truncated = textContent.substring(0, 200);
    const lastSpace = truncated.lastIndexOf(" ");
    const breakPoint = lastSpace > 150 ? lastSpace : 200;

    return textContent.substring(0, breakPoint) + "...";
  }, [
    descriptionMeta.isLong,
    descriptionMeta.cleanDescription,
    getPlainTextLength,
  ]);

  const handleToggle = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setIsExpanded((prev) => !prev);

    if (event?.target) {
      requestAnimationFrame(() => {
        (event.target as HTMLElement).focus();
      });
    }
  }, []);

  const displayContent = useMemo(() => {
    if (descriptionMeta.isEmpty) {
      return fallbackContent;
    }

    if (descriptionMeta.isLong) {
      return isExpanded
        ? descriptionMeta.cleanDescription
        : truncatedDescription;
    }

    return descriptionMeta.cleanDescription;
  }, [
    descriptionMeta.isEmpty,
    descriptionMeta.isLong,
    descriptionMeta.cleanDescription,
    fallbackContent,
    truncatedDescription,
    isExpanded,
  ]);

  const contentRenderer = useMemo(() => {
    const baseClasses =
      "text-base leading-relaxed text-gray-700 dark:text-gray-300 transition-all duration-300 ease-in-out";

    return {
      baseClasses,
      shouldShowReadMore: descriptionMeta.isLong,
      shouldShowEnhancement: descriptionMeta.isShort && enhancedContent,
      buttonLabel: isExpanded ? "Show less" : "Read more",
    };
  }, [
    descriptionMeta.isLong,
    descriptionMeta.isShort,
    enhancedContent,
    isExpanded,
  ]);

  return (
    <div
      className={`text-lg leading-relaxed text-gray-700 dark:text-gray-300 max-w-prose ${className}`}
      data-testid="description-container"
      role="region"
      aria-label="Dog description"
    >
      <div
        className="prose dark:prose-invert max-w-none"
        data-testid="prose-container"
      >
        {/* Main description content */}
        {descriptionMeta.isEmpty ? (
          <p
            className={contentRenderer.baseClasses}
            data-testid="fallback-description"
            aria-label={`Default information about ${sanitizeText(dogName || "this dog")}`}
          >
            {fallbackContent}
          </p>
        ) : (
          <>
            <div
              className={contentRenderer.baseClasses}
              data-testid="description-content"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(displayContent || ""),
              }}
            />

            {/* Enhanced content for short descriptions with subtle animation */}
            {contentRenderer.shouldShowEnhancement && (
              <div
                className="mt-4 text-base leading-relaxed text-gray-600 dark:text-gray-400 italic transform transition-all duration-500 ease-in-out"
                data-testid="enhanced-description"
                aria-label={`Additional information about ${sanitizeText(dogName || "this dog")}`}
                role="complementary"
              >
                {enhancedContent}
              </div>
            )}

            {/* Read more/less button for long descriptions with enhanced accessibility */}
            {contentRenderer.shouldShowReadMore && (
              <div className="mt-3">
                <button
                  onClick={handleToggle}
                  className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 font-medium text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:ring-opacity-50 rounded px-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 active:bg-orange-100 dark:active:bg-orange-900/30"
                  data-testid="read-more-button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-controls="description-content"
                  aria-describedby="description-container"
                  type="button"
                >
                  {contentRenderer.buttonLabel}
                  <span className="sr-only">
                    {isExpanded
                      ? " - Click to show less of the description"
                      : " - Click to show the full description"}
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
