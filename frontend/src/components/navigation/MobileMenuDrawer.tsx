"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ThemeToggle } from "../ui/ThemeToggle";

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenuDrawer({ isOpen, onClose }: MobileMenuDrawerProps) {
  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleLinkClick = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            data-testid="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[60]"
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile menu"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-4/5 max-w-sm bg-background dark:bg-gray-900 z-[70] shadow-2xl overflow-y-auto"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-orange-600"
              aria-label="Close menu"
            >
              <X size={24} className="text-foreground" />
            </button>

            {/* Menu items */}
            <nav
              className="p-8 pt-16 space-y-6"
              aria-label="Mobile drawer navigation"
            >
              <Link
                href="/dogs/country"
                onClick={handleLinkClick}
                className="block text-lg font-medium text-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2"
              >
                Countries
              </Link>
              <Link
                href="/dogs/puppies"
                onClick={handleLinkClick}
                className="block text-lg font-medium text-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2"
              >
                🐶 Puppies
              </Link>
              <Link
                href="/dogs/senior"
                onClick={handleLinkClick}
                className="block text-lg font-medium text-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2"
              >
                🦴 Senior Dogs
              </Link>
              <Link
                href="/guides"
                onClick={handleLinkClick}
                className="block text-lg font-medium text-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2"
              >
                Guides
              </Link>
              <Link
                href="/organizations"
                onClick={handleLinkClick}
                className="block text-lg font-medium text-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2"
              >
                Organizations
              </Link>
              <Link
                href="/about"
                onClick={handleLinkClick}
                className="block text-lg font-medium text-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2"
              >
                About
              </Link>
              <Link
                href="/privacy"
                onClick={handleLinkClick}
                className="block text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2"
              >
                Privacy
              </Link>
              <Link
                href="/faq"
                onClick={handleLinkClick}
                className="block text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2"
              >
                FAQ
              </Link>

              {/* Theme Toggle Section */}
              <div className="pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Theme
                  </span>
                  <ThemeToggle />
                </div>
              </div>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}