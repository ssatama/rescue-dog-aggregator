'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type FontSize = 'comfortable' | 'large' | 'extraLarge';

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

const FONT_SIZE_KEY = 'guide-font-size';

const fontSizes: FontSize[] = ['comfortable', 'large', 'extraLarge'];

const fontSizeMap: Record<FontSize, string> = {
  comfortable: '16px',
  large: '18px',
  extraLarge: '20px',
};

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>('comfortable');

  // Load from localStorage on mount
  useEffect(() => {
    const savedSize = localStorage.getItem(FONT_SIZE_KEY) as FontSize | null;
    if (savedSize && fontSizes.includes(savedSize)) {
      setFontSizeState(savedSize);
    }
  }, []);

  // Apply font size to CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--guide-font-size', fontSizeMap[fontSize]);
  }, [fontSize]);

  // Keyboard shortcuts: Cmd/Ctrl + Plus/Minus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        increaseFontSize();
      } else if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        decreaseFontSize();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fontSize]);

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
    <FontSizeContext.Provider value={{ fontSize, setFontSize, increaseFontSize, decreaseFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within FontSizeProvider');
  }
  return context;
}
