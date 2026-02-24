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

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  const savedTheme = localStorage.getItem("theme");
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  return savedTheme === "light" || savedTheme === "dark" ? savedTheme : systemTheme;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const updateTheme = (newTheme: Theme): void => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
