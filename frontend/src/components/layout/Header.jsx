"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useFadeInAnimation } from "../../utils/animations";
import { Icon } from "../ui/Icon";
import { ThemeToggle } from "../ui/ThemeToggle";
import { FavoriteBadge } from "../favorites/FavoriteBadge";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { ref: headerRef, isVisible } = useFadeInAnimation({ delay: 100 });

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
  const renderNavLink = (href, label, testId, showBadge = false) => {
    const isActive = pathname === href;
    return (
      <div className="relative">
        <Link href={href} className={getLinkClasses(href)}>
          <span className="flex items-center gap-1">
            {showBadge && (
              <>
                <span className="heart-icon text-red-500">❤️</span>
                {label}
                <FavoriteBadge />
              </>
            )}
            {!showBadge && label}
          </span>
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

  // Helper function for mobile links (closes menu on click)
  const handleMobileLinkClick = () => {
    setMobileMenuOpen(false);
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

      <header
        ref={headerRef}
        className={`bg-background border-b border-border shadow-orange-md dark:shadow-purple-md sticky top-0 z-50 transition-all duration-300 ${
          isVisible ? "animate-fade-in" : "opacity-0"
        }`}
      >
        <nav
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4"
          aria-label="Main navigation"
        >
          <div className="flex justify-between items-center">
            {/* Logo/Home link */}
            <div>
              <Link
                href="/"
                className="text-section font-extrabold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-300 hover:scale-105 transform focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400 focus:ring-offset-2 rounded"
              >
                Rescue Dog Aggregator
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-6 items-center">
              {" "}
              {/* Increased spacing for better visual separation */}
              {renderNavLink("/dogs", "Find Dogs", "dogs")}
              {renderNavLink("/favorites", "Favorites", "favorites", true)}
              {renderNavLink(
                "/organizations",
                "Organizations",
                "organizations",
              )}
              {renderNavLink("/about", "About", "about")}
              <ThemeToggle className="ml-4" />
            </div>

            {/* Mobile menu button and theme toggle */}
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <button
                data-testid="mobile-menu-button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-600 dark:focus:ring-orange-400"
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                <span className="sr-only">Open menu</span>
                {mobileMenuOpen ? (
                  <Icon
                    name="x"
                    size="medium"
                    color="interactive"
                    aria-label="Close menu"
                  />
                ) : (
                  <Icon
                    name="menu"
                    size="medium"
                    color="interactive"
                    aria-label="Open menu"
                  />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-2 py-2 space-y-1">
              <div className="relative">
                <Link
                  href="/dogs"
                  className={`block ${getLinkClasses("/dogs")}`}
                  onClick={handleMobileLinkClick}
                >
                  Find Dogs
                </Link>
                {pathname === "/dogs" && (
                  <div
                    data-testid="nav-underline-dogs"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"
                  />
                )}
              </div>
              <div className="relative" data-mobile-menu>
                <Link
                  href="/favorites"
                  className={`block ${getLinkClasses("/favorites")}`}
                  onClick={handleMobileLinkClick}
                >
                  <span className="flex items-center gap-1">
                    <span className="heart-icon text-red-500">❤️</span>
                    Favorites
                    <FavoriteBadge />
                  </span>
                </Link>
                {pathname === "/favorites" && (
                  <div
                    data-testid="nav-underline-favorites"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"
                  />
                )}
              </div>
              <div className="relative">
                <Link
                  href="/organizations"
                  className={`block ${getLinkClasses("/organizations")}`}
                  onClick={handleMobileLinkClick}
                >
                  Organizations
                </Link>
                {pathname === "/organizations" && (
                  <div
                    data-testid="nav-underline-organizations"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"
                  />
                )}
              </div>
              <div className="relative">
                <Link
                  href="/about"
                  className={`block ${getLinkClasses("/about")}`}
                  onClick={handleMobileLinkClick}
                >
                  About
                </Link>
                {pathname === "/about" && (
                  <div
                    data-testid="nav-underline-about"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"
                  />
                )}
              </div>
            </div>
          )}
        </nav>
      </header>
    </>
  );
}
