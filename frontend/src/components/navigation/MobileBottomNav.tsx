"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Grid3X3,
  Heart as FavoritesIcon,
  Building2,
  Dna,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

// Navigation items configuration
const navItems: NavItem[] = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "browse", label: "Browse", icon: Grid3X3, path: "/dogs" },
  { id: "swipe", label: "Swipe", icon: MapPin, path: "/swipe" },
  { id: "breeds", label: "Breeds", icon: Dna, path: "/breeds" },
  {
    id: "favorites",
    label: "Favorites",
    icon: FavoritesIcon,
    path: "/favorites",
  },
  { id: "orgs", label: "Orgs", icon: Building2, path: "/organizations" },
];

const MobileBottomNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Check if we should show the nav based on viewport
  const [shouldRender, setShouldRender] = useState(false);

  // NEVER show on swipe page to prevent overlay interference
  const isSwipePage = pathname === "/swipe" || pathname?.startsWith("/swipe");

  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      // Only show on mobile and tablet (< 1024px) AND not on swipe page
      setShouldRender(width < 1024 && !isSwipePage);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, [isSwipePage]);

  // Handle scroll behavior - show when NOT scrolling
  useEffect(() => {
    // Don't attach scroll listener if on swipe page
    if (isSwipePage) {
      setIsVisible(false);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = Math.abs(currentScrollY - lastScrollY);

      // Only hide if scroll difference is more than 5px (prevent flickering on tiny movements)
      if (scrollDiff > 5) {
        // Mark as scrolling and hide nav immediately
        setIsScrolling(true);
        setIsVisible(false);

        // Clear existing timeout
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }

        // Set new timeout to show nav when scrolling stops
        // Increased from 150ms to 1000ms (1 second) for better UX
        const timeout = setTimeout(() => {
          setIsScrolling(false);
          // Only show if not on swipe page
          if (!isSwipePage) {
            setIsVisible(true);
          }
        }, 1000); // Show nav 1 second after scrolling stops

        setScrollTimeout(timeout);
      }

      setLastScrollY(currentScrollY);
    };

    // Initial state - nav is visible (unless on swipe page)
    setIsVisible(!isSwipePage);

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [scrollTimeout, lastScrollY, isSwipePage]);

  // Don't render on desktop OR on swipe page
  if (!shouldRender || isSwipePage) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex items-center justify-around px-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.path ||
                (item.path !== "/" && pathname?.startsWith(item.path));

              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.path)}
                  className={cn(
                    "flex flex-col items-center justify-center min-h-[56px] min-w-[44px] px-2 py-2 rounded-lg transition-colors",
                    isActive
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
                  )}
                  aria-label={item.label}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileBottomNav;
