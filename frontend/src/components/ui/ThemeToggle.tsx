"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "../providers/ThemeProvider";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className={cn(
        "p-2 rounded-lg transition-colors",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600",
        className,
      )}
      aria-label={mounted ? `Switch to ${theme === "light" ? "dark" : "light"} mode` : "Toggle theme"}
    >
      {!mounted ? (
        <span className="w-5 h-5 block" />
      ) : theme === "light" ? (
        <Icon name="moon" className="w-5 h-5" />
      ) : (
        <Icon name="sun" className="w-5 h-5" />
      )}
    </button>
  );
}
