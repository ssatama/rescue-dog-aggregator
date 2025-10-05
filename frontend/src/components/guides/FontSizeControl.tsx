"use client";

import { useFontSize } from "@/contexts/FontSizeContext";
import { Button } from "@/components/ui/button";
import { Minus, Type, Plus } from "lucide-react";

export function FontSizeControl() {
  const { fontSize, setFontSize, increaseFontSize, decreaseFontSize } =
    useFontSize();

  const sizes = [
    { value: "comfortable" as const, label: "A", title: "Comfortable (16px)" },
    {
      value: "large" as const,
      label: "A",
      title: "Large (18px)",
      larger: true,
    },
    {
      value: "extraLarge" as const,
      label: "A",
      title: "Extra Large (20px)",
      largest: true,
    },
  ];

  return (
    <div className="fixed bottom-6 left-6 z-40 bg-white dark:bg-guide-dark-elevated shadow-lg rounded-lg p-2 flex items-center gap-1 border border-gray-200 dark:border-guide-dark-border">
      {/* Decrease button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={decreaseFontSize}
        disabled={fontSize === "comfortable"}
        className="h-8 w-8 p-0"
        title="Decrease font size (Ctrl/Cmd + -)"
        aria-label="Decrease font size"
      >
        <Minus className="h-4 w-4" />
      </Button>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-200 dark:bg-guide-dark-border" />

      {/* Font size buttons */}
      {sizes.map((size) => (
        <Button
          key={size.value}
          variant={fontSize === size.value ? "default" : "ghost"}
          size="sm"
          onClick={() => setFontSize(size.value)}
          className={`h-8 w-8 p-0 ${fontSize === size.value ? "bg-orange-500 hover:bg-orange-600" : ""}`}
          title={size.title}
          aria-label={size.title}
        >
          <span
            className={`font-bold ${size.larger ? "text-lg" : size.largest ? "text-xl" : "text-base"}`}
          >
            {size.label}
          </span>
        </Button>
      ))}

      {/* Divider */}
      <div className="h-6 w-px bg-gray-200 dark:bg-guide-dark-border" />

      {/* Increase button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={increaseFontSize}
        disabled={fontSize === "extraLarge"}
        className="h-8 w-8 p-0"
        title="Increase font size (Ctrl/Cmd + +)"
        aria-label="Increase font size"
      >
        <Plus className="h-4 w-4" />
      </Button>

      {/* Label */}
      <div className="ml-1 px-2 text-xs text-gray-600 dark:text-guide-text-secondary hidden sm:block">
        Text Size
      </div>
    </div>
  );
}
