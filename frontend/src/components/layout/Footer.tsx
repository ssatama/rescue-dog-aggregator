import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

const COLUMNS = [
  {
    title: "Find dogs",
    links: [
      { href: "/dogs", label: "All dogs" },
      { href: "/breeds", label: "Breeds" },
      { href: "/dogs/puppies", label: "Puppies" },
      { href: "/dogs/senior", label: "Seniors" },
      { href: "/dogs/country", label: "By country" },
      { href: "/swipe", label: "Swipe" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/guides", label: "Guides" },
      { href: "/guides/european-rescue-guide", label: "Adopting from abroad" },
      { href: "/guides/first-time-owner-guide", label: "First-time owners" },
      { href: "/guides/costs-and-preparation", label: "Costs" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "About us" },
      { href: "/organizations", label: "Rescues" },
      { href: "/faq", label: "FAQ" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

const LINK = "text-sm text-subtle transition-colors hover:text-ink hover:underline underline-offset-4";

/** One footer at every width (#496): phones keep the links, in two columns. */
export default function Footer() {
  return (
    // Below 1024px the tab bar covers the bottom of the page
    <footer className="mt-auto border-t border-line bg-surface pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 mb-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Image
                src="/logo.jpeg"
                alt="Rescue Dog Aggregator logo"
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
              <div>
                <span className="block font-display text-base font-bold text-ink">Rescue Dog Aggregator</span>
                <span className="mt-1 block text-sm text-subtle">
                  Every rescue dog in one place. Free, no account.
                </span>
              </div>
            </Link>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="mb-3 text-sm font-semibold text-ink">{column.title}</h2>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={LINK}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <p className="flex items-center gap-1 text-sm text-subtle">
            Made with <Heart aria-label="love" className="inline h-4 w-4 text-orange-600" fill="currentColor" /> in Europe
          </p>
          <p className="text-sm text-subtle">You adopt through the rescue. We never charge.</p>
        </div>
      </div>
    </footer>
  );
}
