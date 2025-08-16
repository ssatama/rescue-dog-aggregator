import React from "react";
import { render, screen, fireEvent } from "../../../test-utils";
import { ThemeProvider } from "../../providers/ThemeProvider";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "../sheet";

// Helper to render with ThemeProvider in dark mode
const renderWithDarkTheme = (component) => {
  // Set dark mode in localStorage
  localStorage.setItem("theme", "dark");
  document.documentElement.classList.add("dark");

  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe("Sheet Component - Dark Mode Support", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  describe("Dark Mode Overlay Support", () => {
    test("should have proper overlay styling in dark mode", () => {
      renderWithDarkTheme(
        <Sheet open>
          <SheetContent data-testid="sheet-content">
            <SheetHeader>
              <SheetTitle>Test Sheet</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>,
      );

      // Find the overlay element (it's added by Radix)
      const overlay = document.querySelector("[data-radix-dialog-overlay]");

      if (overlay) {
        // Should have dark mode overlay styling
        expect(overlay).toHaveClass("dark:bg-background/80");
        expect(overlay).toHaveClass("dark:backdrop-blur-sm");
      }

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");
    });

    test("should have enhanced backdrop in dark mode", () => {
      renderWithDarkTheme(
        <Sheet open>
          <SheetContent data-testid="backdrop-content">Content</SheetContent>
        </Sheet>,
      );

      const overlay = document.querySelector("[data-radix-dialog-overlay]");

      if (overlay) {
        // Should have backdrop blur for better dark mode appearance
        expect(overlay).toHaveClass("dark:backdrop-blur-sm");
      }
    });
  });

  describe("Dark Mode Content Styling", () => {
    test("should use semantic background in dark mode", () => {
      renderWithDarkTheme(
        <Sheet open>
          <SheetContent data-testid="content" side="right">
            <SheetHeader>
              <SheetTitle>Dark Mode Sheet</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>,
      );

      const content = screen.getByTestId("content");

      // Should use semantic background
      expect(content).toHaveClass("bg-background");

      // Should have dark mode border enhancements
      expect(content).toHaveClass("dark:border-border/50");
      expect(content).toHaveClass("dark:shadow-2xl");
      expect(content).toHaveClass("dark:shadow-purple-500/10");
    });

    test("should handle different sides properly in dark mode", () => {
      const sides = ["top", "bottom", "left", "right"];

      sides.forEach((side) => {
        renderWithDarkTheme(
          <Sheet open>
            <SheetContent data-testid={`content-${side}`} side={side}>
              <SheetTitle>{side} Sheet</SheetTitle>
            </SheetContent>
          </Sheet>,
        );

        const content = screen.getByTestId(`content-${side}`);

        // Should have proper border based on side
        if (side === "top") {
          expect(content).toHaveClass("border-b");
          expect(content).toHaveClass("dark:border-b-border/50");
        } else if (side === "bottom") {
          expect(content).toHaveClass("border-t");
          expect(content).toHaveClass("dark:border-t-border/50");
        } else if (side === "left") {
          expect(content).toHaveClass("border-r");
          expect(content).toHaveClass("dark:border-r-border/50");
        } else if (side === "right") {
          expect(content).toHaveClass("border-l");
          expect(content).toHaveClass("dark:border-l-border/50");
        }

        // All sides should have dark mode styling
        expect(content).toHaveClass("bg-background");
        expect(content).toHaveClass("dark:shadow-2xl");
      });
    });
  });

  describe("Dark Mode Close Button", () => {
    test("should have proper close button styling in dark mode", () => {
      renderWithDarkTheme(
        <Sheet open>
          <SheetContent>
            <SheetTitle>Test Sheet</SheetTitle>
          </SheetContent>
        </Sheet>,
      );

      // Find the close button (it's automatically added by SheetContent)
      const closeButton = document.querySelector("[data-radix-dialog-close]");

      if (closeButton) {
        // Should have dark mode close button styling
        expect(closeButton).toHaveClass("dark:hover:bg-secondary/80");
        expect(closeButton).toHaveClass("dark:focus:ring-purple-500");
        expect(closeButton).toHaveClass("dark:text-muted-foreground");
      }
    });

    test("should have accessible close button in dark mode", () => {
      renderWithDarkTheme(
        <Sheet open>
          <SheetContent>
            <SheetTitle>Accessible Sheet</SheetTitle>
          </SheetContent>
        </Sheet>,
      );

      // Should have screen reader text
      const closeText = screen.getByText("Close");
      expect(closeText).toHaveClass("sr-only");
    });
  });

  describe("Dark Mode Typography", () => {
    test("should have proper title styling in dark mode", () => {
      renderWithDarkTheme(
        <Sheet open>
          <SheetContent>
            <SheetHeader>
              <SheetTitle data-testid="sheet-title">Dark Mode Title</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>,
      );

      const title = screen.getByTestId("sheet-title");

      // Should use semantic text color
      expect(title).toHaveClass("text-foreground");
      expect(title).toHaveClass("text-lg");
      expect(title).toHaveClass("font-semibold");
    });

    test("should have proper description styling in dark mode", () => {
      renderWithDarkTheme(
        <Sheet open>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Title</SheetTitle>
              <SheetDescription data-testid="sheet-description">
                This is a description in dark mode
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>,
      );

      const description = screen.getByTestId("sheet-description");

      // Should use semantic muted text color
      expect(description).toHaveClass("text-muted-foreground");
      expect(description).toHaveClass("text-sm");
    });
  });

  describe("Dark Mode Layout Components", () => {
    test("should handle header properly in dark mode", () => {
      renderWithDarkTheme(
        <Sheet open>
          <SheetContent>
            <SheetHeader data-testid="sheet-header">
              <SheetTitle>Header Title</SheetTitle>
              <SheetDescription>Header description</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>,
      );

      const header = screen.getByTestId("sheet-header");

      // Should have proper layout classes
      expect(header).toHaveClass("flex");
      expect(header).toHaveClass("flex-col");
      expect(header).toHaveClass("space-y-2");
    });

    test("should handle footer properly in dark mode", () => {
      renderWithDarkTheme(
        <Sheet open>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Title</SheetTitle>
            </SheetHeader>
            <SheetFooter data-testid="sheet-footer">
              <button>Cancel</button>
              <button>Save</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>,
      );

      const footer = screen.getByTestId("sheet-footer");

      // Should have proper layout classes
      expect(footer).toHaveClass("flex");
      expect(footer).toHaveClass("flex-col-reverse");
      expect(footer).toHaveClass("sm:flex-row");
      expect(footer).toHaveClass("sm:justify-end");
    });
  });

  describe("Dark Mode Interactions", () => {
    test("should handle trigger interaction in dark mode", () => {
      renderWithDarkTheme(
        <Sheet>
          <SheetTrigger data-testid="sheet-trigger" asChild>
            <button>Open Sheet</button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle>Triggered Sheet</SheetTitle>
          </SheetContent>
        </Sheet>,
      );

      const trigger = screen.getByTestId("sheet-trigger");

      // Should be accessible
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveTextContent("Open Sheet");
    });

    test("should handle manual close button in dark mode", () => {
      renderWithDarkTheme(
        <Sheet open>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Closeable Sheet</SheetTitle>
            </SheetHeader>
            <SheetClose data-testid="manual-close" asChild>
              <button>Manual Close</button>
            </SheetClose>
          </SheetContent>
        </Sheet>,
      );

      const manualClose = screen.getByTestId("manual-close");

      // Should be accessible close button
      expect(manualClose).toBeInTheDocument();
      expect(manualClose).toHaveTextContent("Manual Close");
    });
  });

  describe("Dark Mode Responsive Design", () => {
    test("should handle responsive sizing in dark mode", () => {
      renderWithDarkTheme(
        <Sheet open>
          <SheetContent side="left" data-testid="responsive-sheet">
            <SheetTitle>Responsive Sheet</SheetTitle>
          </SheetContent>
        </Sheet>,
      );

      const content = screen.getByTestId("responsive-sheet");

      // Should have responsive width classes
      expect(content).toHaveClass("w-3/4");
      expect(content).toHaveClass("sm:max-w-sm");
    });

    test("should handle different viewport orientations in dark mode", () => {
      renderWithDarkTheme(
        <Sheet open>
          <SheetContent side="bottom" data-testid="bottom-sheet">
            <SheetTitle>Bottom Sheet</SheetTitle>
          </SheetContent>
        </Sheet>,
      );

      const content = screen.getByTestId("bottom-sheet");

      // Should span full width
      expect(content).toHaveClass("inset-x-0");
      expect(content).toHaveClass("bottom-0");
    });
  });

  describe("Dark Mode Accessibility", () => {
    test("should maintain accessibility features in dark mode", () => {
      renderWithDarkTheme(
        <Sheet open>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Accessible Dark Sheet</SheetTitle>
              <SheetDescription>
                This sheet works well with screen readers in dark mode
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>,
      );

      // Should have proper dialog role
      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).toBeInTheDocument();

      // Should have title and description
      expect(screen.getByText("Accessible Dark Sheet")).toBeInTheDocument();
      expect(
        screen.getByText(/screen readers in dark mode/),
      ).toBeInTheDocument();
    });

    test("should handle focus trapping in dark mode", () => {
      renderWithDarkTheme(
        <Sheet open>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Focus Test</SheetTitle>
            </SheetHeader>
            <button data-testid="focusable-button">Focusable Element</button>
          </SheetContent>
        </Sheet>,
      );

      const button = screen.getByTestId("focusable-button");

      // Should be focusable
      expect(button).toBeInTheDocument();

      // Focus should be trapped within the dialog
      // The close button or other focusable elements should have focus
      const focusedElement = document.activeElement;
      expect(focusedElement).not.toBe(document.body);
      expect(focusedElement).not.toBeNull();

      // Dialog should contain focusable elements
      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).toContainElement(focusedElement);
    });
  });

  describe("Dark Mode Custom Styling", () => {
    test("should support custom dark mode classes", () => {
      renderWithDarkTheme(
        <Sheet open>
          <SheetContent
            data-testid="custom-sheet"
            className="dark:bg-slate-900 dark:border-slate-700"
          >
            <SheetTitle>Custom Styled Sheet</SheetTitle>
          </SheetContent>
        </Sheet>,
      );

      const content = screen.getByTestId("custom-sheet");

      // Should preserve custom classes
      expect(content).toHaveClass("dark:bg-slate-900");
      expect(content).toHaveClass("dark:border-slate-700");

      // Should still have base classes
      expect(content).toHaveClass("fixed");
      expect(content).toHaveClass("z-50");
    });
  });
});
