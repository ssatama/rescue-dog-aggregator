import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import GlobalSearch from "../search/GlobalSearch";
import LocationPicker from "../location/LocationPicker";
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

          {/* Phones get the field at the top of home and the catalog instead */}
          <div className="flex flex-1 justify-center">
            <Suspense fallback={<div className="hidden h-10 w-full max-w-md sm:block" />}>
              <GlobalSearch surface="header" className="hidden w-full max-w-md sm:block" />
            </Suspense>
          </div>

          <LocationPicker />

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
