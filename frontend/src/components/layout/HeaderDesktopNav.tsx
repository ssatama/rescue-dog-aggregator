"use client";

import React from "react";
import Link from "next/link";
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

export default function HeaderDesktopNav() {
  const pathname = usePathname();

  const getLinkClasses = (href: string): string => {
    const isActive = pathname === href;
    return `px-3 py-2 rounded-md text-small font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600/50 ${
      isActive
        ? "text-orange-600 dark:text-orange-400 font-semibold"
        : "text-foreground hover:text-orange-600 dark:hover:text-orange-400"
    }`;
  };

  const renderNavLink = (href: string, label: string, testId: string): React.ReactElement => {
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
  );
}
