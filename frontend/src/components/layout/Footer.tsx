import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

const COLUMNS = [
  {
    title: "Find Dogs",
    links: [
      { href: "/dogs", label: "All Dogs" },
      { href: "/breeds", label: "Breeds" },
      { href: "/swipe", label: "Swipe" },
      { href: "/dogs/puppies", label: "Puppies" },
      { href: "/dogs/senior", label: "Seniors" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/guides", label: "Guides" },
      { href: "/guides/european-rescue-guide", label: "European Rescue" },
      { href: "/guides/first-time-owner-guide", label: "First-Time Owner" },
      { href: "/guides/costs-and-preparation", label: "Costs" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/organizations", label: "Organizations" },
      { href: "/faq", label: "FAQ" },
    ],
  },
];

const LINK = "text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors";

/** One footer at every width (#496): phones keep the links, in two columns. */
export default function Footer() {
  return (
    // Below 1024px the tab bar covers the bottom of the page
    <footer className="bg-card text-card-foreground border-t border-border mt-auto pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 mb-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-3 text-card-title font-semibold text-foreground hover:text-muted-foreground"
            >
              <Image
                src="/logo.jpeg"
                alt="Rescue Dog Aggregator logo"
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
              <div>
                <span className="block text-base font-semibold">Rescue Dog Aggregator</span>
                <p className="mt-1 text-sm text-muted-foreground font-normal">
                  Helping rescue dogs find loving homes.
                </p>
              </div>
            </Link>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="font-semibold text-foreground mb-4">{column.title}</h3>
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

        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Made with <Heart aria-hidden="true" className="h-4 w-4 text-red-500 inline" fill="currentColor" /> in Europe
          </p>
          <Link href="/privacy" className={LINK}>
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
