import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import GlobalSearch from "@/components/search/GlobalSearch";

const PATHS_BACK = [
  { href: "/dogs", label: "Browse all dogs" },
  { href: "/breeds", label: "Breeds" },
  { href: "/guides", label: "Guides" },
];

export const PRIMARY_ACTION =
  "inline-flex h-11 items-center justify-center rounded-lg bg-orange-700 px-5 font-semibold text-white transition-colors hover:bg-orange-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const SECONDARY_ACTION =
  "inline-flex h-11 items-center justify-center rounded-lg border border-line bg-surface px-5 font-semibold text-ink transition-colors hover:bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The one pattern for a page that could not show what was asked for, a 404 or
 * an error (#503): what happened in plain words, then ways back to dogs. The
 * header has a search field from 640px; below that, one sits here.
 */
export default function WayBack({
  eyebrow,
  title,
  message,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  message: ReactNode;
  /** Comes first, before the ways back (e.g. "Try again") */
  action?: ReactNode;
  /** Below the ways back (e.g. recently listed dogs) */
  children?: ReactNode;
}): React.JSX.Element {
  return (
    <div className="mx-auto max-w-5xl py-8 lg:py-12">
      <div className="max-w-2xl">
        {eyebrow && <p className="text-sm font-semibold text-subtle">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
        <div className="mt-3 text-lg text-subtle">{message}</div>
        {/* GlobalSearch reads the URL; without a boundary the static 404 fails to build */}
        <Suspense fallback={<div className="mt-6 h-11 sm:hidden" />}>
          <GlobalSearch surface="mobile" className="mt-6 sm:hidden" />
        </Suspense>
        <nav aria-label="Ways back" className="mt-6 flex flex-wrap gap-3">
          {action}
          {PATHS_BACK.map(({ href, label }, i) => (
            <Link key={href} href={href} className={i === 0 && !action ? PRIMARY_ACTION : SECONDARY_ACTION}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
