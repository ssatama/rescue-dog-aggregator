import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LandingNavItem {
  href: string;
  label: string;
  current?: boolean;
}

/**
 * The sibling pages of a landing page (#502): All dogs, Puppies, Seniors, or
 * the countries. One row of links that scrolls sideways on a phone.
 */
export default function LandingNav({ label, items }: { label: string; items: LandingNavItem[] }): React.JSX.Element {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                item.current
                  ? "border-ink bg-ink text-surface"
                  : "border-line bg-surface text-ink hover:bg-soft",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
