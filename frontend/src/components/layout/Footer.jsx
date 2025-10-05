import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-card text-card-foreground border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Desktop: Grid with logo + 3 columns */}
        <div className="hidden md:grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div>
            <Link
              href="/"
              className="flex items-center gap-3 text-card-title font-semibold text-foreground hover:text-muted-foreground"
            >
              <Image
                src="/logo.jpeg"
                alt="Rescue Dog Aggregator logo"
                width={60}
                height={60}
                className="rounded-full object-cover"
              />
              <div>
                <span className="block text-base font-semibold">
                  Rescue Dog Aggregator
                </span>
                <p className="mt-1 text-sm text-muted-foreground font-normal">
                  Helping rescue dogs find loving homes.
                </p>
              </div>
            </Link>
          </div>

          {/* Discover Column */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Discover</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/dogs"
                  className="text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  Browse Dogs
                </Link>
              </li>
              <li>
                <Link
                  href="/breeds"
                  className="text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  Breeds
                </Link>
              </li>
              <li>
                <Link
                  href="/swipe"
                  className="text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  Swipe
                </Link>
              </li>
            </ul>
          </div>

          {/* Guides Column */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Guides</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/guides/european-rescue-guide"
                  className="text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  European Rescue
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/why-rescue-from-abroad"
                  className="text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  Why Rescue
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/first-time-owner-guide"
                  className="text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  First-Time Owner
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/costs-and-preparation"
                  className="text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  Costs
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/organizations"
                  className="text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  Organizations
                </Link>
              </li>
              <li>
                <Link
                  href="/about#contact"
                  className="text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Mobile: Simplified logo only */}
        <div className="md:hidden">
          <Link
            href="/"
            className="flex items-center gap-2 text-card-title font-semibold text-foreground hover:text-muted-foreground"
          >
            <Image
              src="/logo.jpeg"
              alt="Rescue Dog Aggregator logo"
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
            <div>
              <span className="text-sm font-semibold">
                Rescue Dog Aggregator
              </span>
              <p className="text-xs text-muted-foreground font-normal">
                Helping rescue dogs find loving homes.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </footer>
  );
}
