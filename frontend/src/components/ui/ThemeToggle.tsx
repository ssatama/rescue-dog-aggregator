"use client";

import React, { useSyncExternalStore } from "react";
import { useTheme } from "../providers/ThemeProvider";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

const emptySubscribe = (): (() => void) => () => {};
const getClientSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  const isLight = theme === "light";
  const iconName = isLight ? "moon" : "sun";
  const ariaLabel = mounted ? `Switch to ${isLight ? "dark" : "light"} mode` : "Toggle theme";

  return (
    <button
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className={cn(
        "p-2 rounded-lg transition-colors",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600",
        className,
      )}
      aria-label={ariaLabel}
    >
      {mounted ? (
        <Icon name={iconName} className="w-5 h-5" />
      ) : (
        <span className="w-5 h-5 block" />
      )}
    </button>
  );
}
