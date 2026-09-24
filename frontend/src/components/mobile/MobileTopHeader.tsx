"use client";

import React from "react";

/**
 * MobileTopHeader Component
 *
 * The mobile home's intro line. The site header above it carries the
 * rescuedogs wordmark, so this only holds the page's H1.
 */
export default function MobileTopHeader() {
  return (
    <div className="px-4 pt-4 pb-2 sm:hidden">
      {/* The mobile homepage's only visible H1, so it carries the keywords (#444) */}
      <h1 className="font-sans text-[15px] font-medium leading-snug text-gray-600 dark:text-gray-400">
        Your gateway to European rescue dogs
      </h1>
    </div>
  );
}
