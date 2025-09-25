"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
import Link from "next/link";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

// Configuration constants
const SCROLL_THRESHOLD = 10; // Minimum scroll distance to trigger hide/show
const SHOW_DELAY = 100; // Delay before showing nav when scrolling up
const IDLE_SHOW_DELAY = 2000; // Show after 2 seconds of inactivity
const TOP_Y_SHOW = 20; // Always show nav when scrolled to top

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
  const [shouldRender, setShouldRender] = useState(false);
  
  // Use refs to avoid stale closures and prevent re-renders
  const lastScrollY = useRef(0);
  const idleShowTimeout = useRef<ReturnType<typeof setTimeout> | null>(null); // Renamed from hideTimeout
  const showTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticking = useRef(false);
  const isVisibleRef = useRef(isVisible);

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  // NEVER show on swipe page - simplified check
  const isSwipePage = pathname?.startsWith("/swipe");

  // Viewport check
  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      setShouldRender(width < 1024 && !isSwipePage);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, [isSwipePage]);

  // Optimized scroll handler with proper direction detection
  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    
    ticking.current = true;
    requestAnimationFrame(() => {
      // Clamp to prevent negative values on iOS overscroll
      const currentScrollY = Math.max(0, window.scrollY || window.pageYOffset);
      const scrollDiff = currentScrollY - lastScrollY.current;
      const isScrollingDown = scrollDiff > 0;
      const isScrollingUp = scrollDiff < 0;
      const scrollDistance = Math.abs(scrollDiff);

      // Clear any pending timers
      if (idleShowTimeout.current) {
        clearTimeout(idleShowTimeout.current);
        idleShowTimeout.current = null;
      }
      if (showTimeout.current) {
        clearTimeout(showTimeout.current);
        showTimeout.current = null;
      }

      // Only act if scrolled more than threshold
      if (scrollDistance > SCROLL_THRESHOLD) {
        if (isScrollingDown && currentScrollY > TOP_Y_SHOW) {
          // Hide immediately when scrolling down (unless at top)
          setIsVisible(false);
        } else if (isScrollingUp) {
          // Show with slight delay when scrolling up
          showTimeout.current = setTimeout(() => {
            setIsVisible(true);
          }, SHOW_DELAY);
        }
      }

      // If at top of page, always show
      if (currentScrollY <= TOP_Y_SHOW) {
        setIsVisible(true);
      }

      // Set timeout to show nav when user stops scrolling (only if hidden)
      if (currentScrollY > TOP_Y_SHOW && !isVisibleRef.current) {
        idleShowTimeout.current = setTimeout(() => {
          setIsVisible(true);
        }, IDLE_SHOW_DELAY);
      }

      lastScrollY.current = currentScrollY;
      ticking.current = false;
    });
  }, []); // Empty deps: uses refs for all mutable values, setIsVisible is stable

  // Attach scroll listener
  useEffect(() => {
    if (isSwipePage) {
      setIsVisible(false);
      return;
    }

    // Initial state already set by useState(true), no need to set again
    lastScrollY.current = window.scrollY;

    // Add throttled scroll listener
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      // Clean up all timers on unmount
      if (idleShowTimeout.current) {
        clearTimeout(idleShowTimeout.current);
      }
      if (showTimeout.current) {
        clearTimeout(showTimeout.current);
      }
    };
  }, [isSwipePage, handleScroll]);

  // Don't render on desktop or swipe page
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
          transition={{ 
            type: "spring", 
            damping: 30, 
            stiffness: 300,
            mass: 0.8
          }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 will-change-transform"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="flex items-center justify-around px-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.path ||
                (item.path !== "/" && pathname?.startsWith(item.path));

              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center min-h-[56px] min-w-[44px] px-2 py-2 rounded-lg transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
                    isActive
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
                  )}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileBottomNav;