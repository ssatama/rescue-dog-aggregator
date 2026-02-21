"use client";

import React, { useState, useCallback } from "react";
import { Icon } from "../ui/Icon";

export interface FilterSectionProps {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  count?: number;
}

export default function FilterSection({
  id,
  title,
  defaultOpen = false,
  children,
  count = 0,
}: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  const handleToggle = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    setIsOpen((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle(e);
      }
    },
    [handleToggle],
  );

  const hasActiveFilters = count > 0;

  return (
    <details
      data-testid={`filter-section-${id}`}
      data-open={isOpen}
      className={`filter-section overflow-hidden will-change-transform group ${
        hasActiveFilters ? "filter-section-active" : ""
      } ${!isOpen ? "collapsed" : ""}`}
      aria-label={`${title} filters section`}
      open={isOpen}
      role="region"
    >
      <summary
        data-testid={`filter-summary-${id}`}
        className="flex items-center justify-between cursor-pointer py-3 px-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 ease-out interactive-enhanced btn-focus-ring"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-expanded={isOpen}
        role="button"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-700 dark:text-gray-300">
            {title}
          </h3>
          {count > 0 && (
            <span className="inline-flex bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 rounded-full text-xs">
              ({count})
            </span>
          )}
        </div>
        <Icon
          name="chevron-down"
          size="small"
          data-testid={`chevron-icon-${id}`}
          className={`text-gray-500 chevron-icon transition-transform duration-200 ease-out ${
            isOpen ? "chevron-open" : ""
          } group-open:rotate-180`}
        />
      </summary>
      <div
        data-testid={`filter-content-${id}`}
        className="filter-section-content transition-opacity transition-transform duration-200 ease-out will-change-transform mt-3 space-y-3 px-4 pb-2"
      >
        {children}
      </div>
    </details>
  );
}
