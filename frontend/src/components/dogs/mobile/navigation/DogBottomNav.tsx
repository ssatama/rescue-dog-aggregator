"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Heart, Layers3 } from "lucide-react";
import styles from "./DogBottomNav.module.css";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  ariaLabel: string;
}

const navItems: NavItem[] = [
  { href: "/", icon: Home, label: "Home", ariaLabel: "Go to home page" },
  { href: "/dogs", icon: Search, label: "Browse", ariaLabel: "Browse dogs" },
  {
    href: "/favorites",
    icon: Heart,
    label: "Favorites",
    ariaLabel: "View favorites",
  },
  {
    href: "/swipe",
    icon: Layers3,
    label: "Swipe",
    ariaLabel: "Swipe through dogs",
  },
];

export function DogBottomNav() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const pathname = usePathname();
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - lastScrollY;
    const scrollThreshold = 50;

    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Scrolling down - hide
    if (scrollDelta > scrollThreshold && currentScrollY > 100) {
      setIsVisible(false);
    }
    // Scrolling up - show
    else if (scrollDelta < -20) {
      setIsVisible(true);
    }
    // At top - always show
    else if (currentScrollY < 50) {
      setIsVisible(true);
    }
    // At bottom - show
    else if (
      window.innerHeight + currentScrollY >=
      document.documentElement.scrollHeight - 100
    ) {
      setIsVisible(true);
    }

    setLastScrollY(currentScrollY);

    // Show nav after user stops scrolling for 1 second
    scrollTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 1000);
  }, [lastScrollY]);

  useEffect(() => {
    // Only attach scroll listener on mobile
    if (window.innerWidth >= 768) return;

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Only render on mobile
  if (typeof window !== "undefined" && window.innerWidth >= 768) {
    return null;
  }

  return (
    <nav
      className={`${styles.bottomNav} ${isVisible ? styles.visible : styles.hidden}`}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className={styles.navContainer}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href === "/dogs" && pathname?.startsWith("/dogs"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
              aria-label={item.ariaLabel}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={24} className={styles.icon} aria-hidden="true" />
              <span className={styles.label}>{item.label}</span>
              {isActive && <span className={styles.activeIndicator} />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
