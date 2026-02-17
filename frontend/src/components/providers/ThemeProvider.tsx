"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
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
  return (savedTheme as Theme) || systemTheme;
};

const emptySubscribe = () => () => {};

const useMounted = () => {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const mounted = useMounted();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const updateTheme = (newTheme: Theme): void => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // Prevent hydration mismatch
  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
