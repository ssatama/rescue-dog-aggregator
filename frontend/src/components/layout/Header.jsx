"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, ArrowRight } from "lucide-react";
import { ThemeToggle } from "../ui/ThemeToggle";
import { FavoriteBadge } from "../favorites/FavoriteBadge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import logo from "../../../public/logo.jpeg";

export default function Header() {
  const pathname = usePathname();

  // Helper function to determine link classes
  const getLinkClasses = (href) => {
    const isActive = pathname === href;
    return `px-3 py-2 rounded-md text-small font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600/50 ${
      isActive
        ? "text-orange-600 dark:text-orange-400 font-semibold" // Active styles
        : "text-foreground hover:text-orange-600 dark:hover:text-orange-400" // Default styles
    }`;
  };

  // Helper function to create navigation link with underline indicator
  const renderNavLink = (href, label, testId) => {
    const isActive = pathname === href;
    return (
      <div className="relative">
        <Link href={href} className={getLinkClasses(href)}>
          {label}
        </Link>
        {isActive && (
          <div
            data-testid={`nav-underline-${testId}`}
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"
          />
        )}
      </div>
    );
  };

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
            <div className="hidden md:flex gap-4 items-center relative z-10">
              {/* Dogs Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`${getLinkClasses("/dogs")} flex items-center gap-1`}
                >
                  Dogs
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Browse
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/dogs" className="w-full cursor-pointer">
                      All Dogs
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dogs?sort_by=created_at&sort_order=desc"
                      className="w-full cursor-pointer"
                    >
                      New Arrivals
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Filter By
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/dogs/country" className="w-full cursor-pointer">
                      Country
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dogs/age" className="w-full cursor-pointer">
                      Age
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Popular
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/dogs/puppies" className="w-full cursor-pointer">
                      🐶 Puppies
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dogs/senior" className="w-full cursor-pointer">
                      🦴 Senior Dogs
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {renderNavLink("/breeds", "Breeds", "breeds")}
              {renderNavLink("/guides", "Guides", "guides")}

              {/* About Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`${getLinkClasses("/about")} flex items-center gap-1`}
                >
                  About
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/about" className="w-full cursor-pointer">
                      About Us
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/faq" className="w-full cursor-pointer">
                      FAQ
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/privacy" className="w-full cursor-pointer">
                      Privacy
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/about#contact" className="w-full cursor-pointer">
                      Contact
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Favorites - icon only with badge */}
              <Link
                href="/favorites"
                className="relative p-2 rounded-md hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600/50"
                aria-label="Favorites"
              >
                <Heart
                  className="h-5 w-5 text-red-500"
                  fill="currentColor"
                />
                <FavoriteBadge />
              </Link>

              {/* Start Swiping CTA Button */}
              <Link
                href="/swipe"
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600/50 focus-visible:ring-offset-2"
              >
                Start Swiping
                <ArrowRight className="h-4 w-4" />
              </Link>

              <ThemeToggle />
            </div>

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