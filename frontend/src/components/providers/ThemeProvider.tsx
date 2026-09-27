"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type {
  Theme,
  ThemeContextValue,
  ThemeProviderProps,
} from "@/types/layoutComponents";
import { THEME_COLORS } from "@/constants/themeColors";

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
});

// Must match inline theme script in layout.tsx <head>
const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  try {
    const savedTheme = localStorage.getItem("theme");
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    return savedTheme === "light" || savedTheme === "dark" ? savedTheme : systemTheme;
  } catch {
    return "light";
  }
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // The layout's theme-color tags follow the OS; the theme picked here
  // overrides both, so the browser bar matches the page. Next re-creates the
  // tags on client navigation, so new ones are corrected as they arrive.
  useEffect(() => {
    const color = THEME_COLORS[theme];
    const apply = () =>
      document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
        if (meta.getAttribute("content") !== color) meta.setAttribute("content", color);
      });
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [theme]);

  const updateTheme = (newTheme: Theme): void => {
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    try {
      localStorage.setItem("theme", newTheme);
    } catch {
      // Storage unavailable; theme applies for this session only
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
