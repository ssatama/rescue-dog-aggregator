"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart } from "lucide-react";
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

export default function HeaderDesktopNav(): React.JSX.Element {
  const pathname = usePathname();

  const isActive = (href: string): boolean =>
    pathname === href || Boolean(pathname?.startsWith(`${href}/`));

  const getLinkClasses = (href: string): string =>
    `px-3 py-2 rounded-md text-small font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      isActive(href)
        ? "text-foreground font-semibold"
        : "text-muted-foreground hover:text-foreground"
    }`;

  const renderNavLink = (href: string, label: string, testId: string): React.ReactElement => (
    <div className="relative">
      <Link
        href={href}
        className={getLinkClasses(href)}
        aria-current={isActive(href) ? "page" : undefined}
      >
        {label}
      </Link>
      {isActive(href) && (
        <div
          data-testid={`nav-underline-${testId}`}
          className="absolute -bottom-[13px] left-3 right-3 h-0.5 rounded-full bg-orange-600 dark:bg-orange-400"
        />
      )}
    </div>
  );

  return (
    <div className="hidden lg:flex gap-1 items-center relative z-10">
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
              href="/dogs?sort=newest"
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
      {renderNavLink("/organizations", "Rescues", "rescues")}
      {renderNavLink("/guides", "Guides", "guides")}

      <Link
        href="/favorites"
        className={`${getLinkClasses("/favorites")} flex items-center gap-1.5`}
        aria-current={isActive("/favorites") ? "page" : undefined}
      >
        <Heart className="h-4 w-4" aria-hidden="true" />
        Saved
        <FavoriteBadge />
      </Link>

      <ThemeToggle />
    </div>
  );
}
