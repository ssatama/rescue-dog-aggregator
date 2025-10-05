"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type FontSize = "comfortable" | "large" | "extraLarge";

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(
  undefined,
);

const FONT_SIZE_KEY = "guide-font-size";

const fontSizes: FontSize[] = ["comfortable", "large", "extraLarge"];

const fontSizeMap: Record<FontSize, string> = {
  comfortable: "16px",
  large: "18px",
  extraLarge: "20px",
};

export function FontSizeProvider({ children }: { children: ReactNode }) {
  // SSR-safe initialization with localStorage
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    // Guard against SSR - return default if no window
    if (typeof window === "undefined") return "comfortable";

    const savedSize = localStorage.getItem(FONT_SIZE_KEY) as FontSize | null;
    return savedSize && fontSizes.includes(savedSize)
      ? savedSize
      : "comfortable";
  });

  // Apply font size to CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--guide-font-size",
      fontSizeMap[fontSize],
    );
  }, [fontSize]);

  // Keyboard shortcuts: Cmd/Ctrl + Plus/Minus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        // Use functional setState to avoid fontSize dependency
        setFontSizeState((prev) => {
          const currentIndex = fontSizes.indexOf(prev);
          if (currentIndex < fontSizes.length - 1) {
            const newSize = fontSizes[currentIndex + 1];
            localStorage.setItem(FONT_SIZE_KEY, newSize);
            return newSize;
          }
          return prev;
        });
      } else if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        // Use functional setState to avoid fontSize dependency
        setFontSizeState((prev) => {
          const currentIndex = fontSizes.indexOf(prev);
          if (currentIndex > 0) {
            const newSize = fontSizes[currentIndex - 1];
            localStorage.setItem(FONT_SIZE_KEY, newSize);
            return newSize;
          }
          return prev;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // Empty deps - handler only registers once

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem(FONT_SIZE_KEY, size);
  };

  const increaseFontSize = () => {
    const currentIndex = fontSizes.indexOf(fontSize);
    if (currentIndex < fontSizes.length - 1) {
      setFontSize(fontSizes[currentIndex + 1]);
    }
  };

  const decreaseFontSize = () => {
    const currentIndex = fontSizes.indexOf(fontSize);
    if (currentIndex > 0) {
      setFontSize(fontSizes[currentIndex - 1]);
    }
  };

  return (
    <FontSizeContext.Provider
      value={{ fontSize, setFontSize, increaseFontSize, decreaseFontSize }}
    >
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error("useFontSize must be used within FontSizeProvider");
  }
  return context;
}
