import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "../ui/ThemeToggle";
import HeaderDesktopNav from "./HeaderDesktopNav";
import logo from "../../../public/logo.jpeg";

export default function Header() {
  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-orange-600 dark:bg-orange-500 text-white px-4 py-2 rounded z-50"
      >
        Skip to main content
      </a>

      <header className="bg-background border-b border-border shadow-orange-md dark:shadow-purple-md sticky top-0 z-50">
        <nav
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4"
          aria-label="Main navigation"
        >
          <div className="flex justify-between items-center">
            {/* Logo/Home link */}
            <div className="shrink-0 max-w-fit">
              <Link
                href="/"
                className="flex items-center gap-2 text-section font-extrabold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-300 hover:scale-105 transform focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400 focus:ring-offset-2 rounded"
              >
                <Image
                  src={logo}
                  alt="Rescue Dog Aggregator logo"
                  width={80}
                  height={80}
                  className="rounded-full object-cover md:w-20 md:h-20 w-16 h-16"
                  priority
                />
                <span className="sr-only md:not-sr-only">
                  Rescue Dog Aggregator
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <HeaderDesktopNav />

            {/* Mobile: Only show theme toggle (no hamburger menu) */}
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
