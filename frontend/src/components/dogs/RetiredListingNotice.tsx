import React from "react";
import Link from "next/link";

interface RetiredListingNoticeProps {
  active?: boolean;
}

/**
 * Shown when the scrapers can no longer find a dog at its source organisation.
 *
 * The detail route keeps serving these dogs so the URL survives, which means
 * the page would otherwise read as a live listing for a dog nobody can adopt.
 * The wording stays deliberately vague about why: a dog that vanished from
 * source may have been adopted, withdrawn, or lost to a broken scraper, and
 * production carries no status that distinguishes them.
 */
export default function RetiredListingNotice({
  active,
}: RetiredListingNoticeProps) {
  if (active !== false) {
    return null;
  }

  return (
    <div
      role="status"
      data-testid="retired-listing-notice"
      className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <p className="font-medium">
        This dog is no longer listed by their rescue organisation.
      </p>
      <p className="mt-1 text-sm">
        We keep the page so older links still work, but the details below may be
        out of date.{" "}
        <Link
          href="/dogs"
          className="underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Browse available dogs
        </Link>
        .
      </p>
    </div>
  );
}
