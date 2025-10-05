"use client";

import { useState } from "react";
import { useActiveSection } from "./hooks/useActiveSection";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { List } from "lucide-react";

interface TOCSection {
  id: string;
  title: string;
  level: number;
}

interface TableOfContentsProps {
  sections: TOCSection[];
  readingProgress: number;
}

export function TableOfContents({
  sections,
  readingProgress,
}: TableOfContentsProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const activeId = useActiveSection(sections.map((s) => s.id));
  const currentSectionIndex = sections.findIndex((s) => s.id === activeId);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Desktop: Sticky Left Sidebar */}
      <aside className="hidden lg:block sticky top-24 w-60 max-h-[calc(100vh-8rem)] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Contents</h3>
          {/* Circular progress indicator */}
          <div className="relative w-10 h-10">
            <svg className="transform -rotate-90" width="40" height="40">
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - readingProgress / 100)}`}
                className="text-orange-500 transition-all duration-150"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
              {Math.round(readingProgress)}%
            </span>
          </div>
        </div>

        <nav className="space-y-1">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`block w-full text-left py-2 px-3 rounded transition text-sm ${
                activeId === section.id
                  ? "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-semibold border-l-2 border-orange-500"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                {index + 1}.
              </span>
              {section.title}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile: FAB (Floating Action Button) */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-orange-500 text-white
                     shadow-lg z-40 flex items-center justify-center hover:bg-orange-600
                     transition-colors focus:outline-2 focus:outline-orange-300"
          aria-label="Table of Contents"
        >
          <List className="w-6 h-6" />
          {/* Badge showing current section */}
          <Badge className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs px-1.5">
            {currentSectionIndex + 1}/{sections.length}
          </Badge>
        </button>

        {/* Mobile Drawer */}
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetContent side="bottom" className="h-[70vh]">
            <SheetHeader>
              <SheetTitle>Table of Contents</SheetTitle>
            </SheetHeader>

            <div className="mt-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {Math.round(readingProgress)}% complete
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  ~{Math.ceil((100 - readingProgress) / 10)} min left
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${readingProgress}%` }}
                />
              </div>
            </div>

            <nav className="space-y-2 overflow-y-auto max-h-[calc(70vh-12rem)]">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`block w-full text-left py-3 px-4 rounded-lg transition ${
                    activeId === section.id
                      ? "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-semibold"
                      : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                    {index + 1}.
                  </span>
                  {section.title}
                </button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
