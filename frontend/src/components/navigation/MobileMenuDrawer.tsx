"use client";

import React, { useEffect } from "react";
import {
  X,
  Filter,
  Sparkles,
  Heart,
  Globe,
  BookOpen,
  HelpCircle,
  Building2,
  Users,
  Shield,
  LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ThemeToggle } from "../ui/ThemeToggle";

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface MenuSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    id: "quick-filters",
    title: "Quick Filters",
    icon: Filter,
    items: [
      { label: "Browse Puppies", href: "/dogs/puppies", icon: Sparkles },
      { label: "Browse Seniors", href: "/dogs/senior", icon: Heart },
      { label: "By Country", href: "/dogs/country", icon: Globe },
    ],
  },
  {
    id: "learn-explore",
    title: "Learn & Explore",
    icon: BookOpen,
    items: [
      { label: "Guides", href: "/guides", icon: BookOpen },
      { label: "FAQ", href: "/faq", icon: HelpCircle },
      { label: "Organizations", href: "/organizations", icon: Building2 },
    ],
  },
  {
    id: "about",
    title: "About",
    icon: Users,
    items: [{ label: "About Us", href: "/about", icon: Users }],
  },
];

const footerItems: MenuItem[] = [
  { label: "Privacy", href: "/privacy", icon: Shield },
];

function SectionHeader({
  title,
  icon: Icon,
}: {
  title: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
    </div>
  );
}

function MenuLink({
  item,
  onClose,
}: {
  item: MenuItem;
  onClose: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className="flex items-center gap-3 text-base font-medium text-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2.5 px-2 -mx-2 rounded-lg hover:bg-muted/50"
    >
      <Icon className="w-5 h-5 text-muted-foreground" />
      <span>{item.label}</span>
    </Link>
  );
}

export function MobileMenuDrawer({ isOpen, onClose }: MobileMenuDrawerProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

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
            className="fixed right-0 top-0 bottom-0 w-4/5 max-w-sm bg-background dark:bg-gray-900 z-[70] shadow-2xl flex flex-col"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-orange-600 z-10"
              aria-label="Close menu"
            >
              <X size={24} className="text-foreground" />
            </button>

            {/* Scrollable content area */}
            <nav
              className="flex-1 overflow-y-auto p-6 pt-14"
              aria-label="Mobile drawer navigation"
            >
              {menuSections.map((section, index) => (
                <div key={section.id} className={index > 0 ? "mt-6" : ""}>
                  <SectionHeader title={section.title} icon={section.icon} />
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <MenuLink key={item.href} item={item} onClose={onClose} />
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Footer area - fixed at bottom */}
            <div className="border-t border-border p-6 space-y-4">
              {footerItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Theme Toggle */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium text-foreground">
                  Theme
                </span>
                <ThemeToggle />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
