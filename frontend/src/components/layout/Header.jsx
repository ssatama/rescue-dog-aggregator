"use client";
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation'; // Import usePathname

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname(); // Get the current path

  // Helper function to determine link classes
  const getLinkClasses = (href) => {
    const isActive = pathname === href;
    return `px-3 py-2 rounded-md text-small font-medium ${
      isActive
        ? 'bg-red-100 text-red-700' // Active styles
        : 'text-gray-700 hover:bg-gray-100 hover:text-red-500' // Default styles
    }`;
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
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-blue-600 text-white px-4 py-2 rounded z-50"
      >
        Skip to main content
      </a>
      
      <header className="bg-white shadow sticky top-0 z-50"> {/* Make header sticky */}
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4" aria-label="Main navigation">
        <div className="flex justify-between items-center">
          {/* Logo/Home link */}
          <div>
            <Link href="/" className="text-section font-extrabold text-red-600 hover:text-red-700">
              Rescue Dog Aggregator
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-1"> {/* Reduced space for better fit with background */}
            <Link href="/dogs" className={getLinkClasses('/dogs')}>
              Find Dogs
            </Link>
            <Link href="/organizations" className={getLinkClasses('/organizations')}>
              Organizations
            </Link>
            <Link href="/about" className={getLinkClasses('/about')}>
              About
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg> // Close icon
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg> // Menu icon
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 py-2 space-y-1">
            <Link
              href="/dogs"
              className={`block ${getLinkClasses('/dogs')}`} // Use helper for mobile too
              onClick={handleMobileLinkClick}
            >
              Find Dogs
            </Link>
            <Link
              href="/organizations"
              className={`block ${getLinkClasses('/organizations')}`}
              onClick={handleMobileLinkClick}
            >
              Organizations
            </Link>
            <Link
              href="/about"
              className={`block ${getLinkClasses('/about')}`}
              onClick={handleMobileLinkClick}
            >
              About
            </Link>
          </div>
        )}
        </nav>
      </header>
    </>
  );
}