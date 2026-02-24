"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type {
  Theme,
  ThemeContextValue,
  ThemeProviderProps,
} from "@/types/layoutComponents";

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
