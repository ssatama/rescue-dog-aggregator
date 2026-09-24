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
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-orange-600 dark:bg-orange-400 text-white dark:text-gray-950 px-4 py-2 rounded z-50"
      >
        Skip to main content
      </a>

      <header className="bg-background/95 backdrop-blur border-b border-border sticky top-0 z-50">
        <nav
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-6"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            aria-label="rescuedogs home"
            className="flex shrink-0 items-center gap-2 rounded-md font-display text-xl font-bold tracking-tight text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Image
              src={logo}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
              priority
            />
            rescuedogs
          </Link>

          {/* Global search goes here (#492) */}
          <div className="flex-1" />

          <HeaderDesktopNav />

          {/* Below lg the mobile tab bar carries navigation */}
          <div className="lg:hidden">
            <ThemeToggle />
          </div>
        </nav>
      </header>
    </>
  );
}
