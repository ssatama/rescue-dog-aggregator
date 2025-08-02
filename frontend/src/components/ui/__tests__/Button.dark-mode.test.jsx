import React from "react";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "../../providers/ThemeProvider";
import { Button } from "../button";

// Helper to render with ThemeProvider in dark mode
const renderWithDarkTheme = (component) => {
  // Set dark mode in localStorage
  localStorage.setItem("theme", "dark");
  document.documentElement.classList.add("dark");

  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe("Button Component - Dark Mode Support", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  describe("Dark Mode Shadow Support", () => {
    test("default variant should have purple-tinted shadows in dark mode", () => {
      renderWithDarkTheme(
        <Button data-testid="default-button">Default Button</Button>,
      );

      const button = screen.getByTestId("default-button");

      // Should have dark mode shadow classes
      expect(button).toHaveClass("dark:shadow-purple-500/20");
      expect(button).toHaveClass("hover:dark:shadow-purple-500/30");

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");
    });

    test("destructive variant should have red shadows with dark mode support", () => {
      renderWithDarkTheme(
        <Button data-testid="destructive-button" variant="destructive">
          Delete
        </Button>,
      );

      const button = screen.getByTestId("destructive-button");

      // Should have dark mode red shadows
      expect(button).toHaveClass("dark:shadow-red-500/20");
      expect(button).toHaveClass("hover:dark:shadow-red-500/30");

      // Should still have base destructive styling
      expect(button).toHaveClass("bg-destructive");
      expect(button).toHaveClass("text-destructive-foreground");
    });

    test("outline variant should have proper dark mode shadows", () => {
      renderWithDarkTheme(
        <Button data-testid="outline-button" variant="outline">
          Outline Button
        </Button>,
      );

      const button = screen.getByTestId("outline-button");

      // Should have dark mode outline shadows
      expect(button).toHaveClass("dark:shadow-purple-500/10");
      expect(button).toHaveClass("hover:dark:shadow-purple-500/20");

      // Should still use semantic tokens
      expect(button).toHaveClass("bg-background");
      expect(button).toHaveClass("border-input");
    });

    test("secondary variant should have orange shadows with dark mode support", () => {
      renderWithDarkTheme(
        <Button data-testid="secondary-button" variant="secondary">
          Secondary
        </Button>,
      );

      const button = screen.getByTestId("secondary-button");

      // Should have dark mode orange shadows
      expect(button).toHaveClass("dark:shadow-orange-500/15");
      expect(button).toHaveClass("hover:dark:shadow-orange-500/25");

      // Should use semantic tokens
      expect(button).toHaveClass("bg-secondary");
      expect(button).toHaveClass("text-secondary-foreground");
    });

    test("ghost variant should have minimal dark mode shadows", () => {
      renderWithDarkTheme(
        <Button data-testid="ghost-button" variant="ghost">
          Ghost Button
        </Button>,
      );

      const button = screen.getByTestId("ghost-button");

      // Should have subtle dark mode shadows only on hover
      expect(button).toHaveClass("hover:dark:shadow-purple-500/10");

      // Ghost buttons should have no background
      expect(button).not.toHaveClass("bg-primary");
      expect(button).not.toHaveClass("bg-secondary");
    });

    test("link variant should have no shadows in dark mode", () => {
      renderWithDarkTheme(
        <Button data-testid="link-button" variant="link">
          Link Button
        </Button>,
      );

      const button = screen.getByTestId("link-button");

      // Link buttons should not have shadows
      expect(button).toHaveClass("hover:shadow-none");
      expect(button).not.toHaveClass("shadow-");

      // Should use semantic text color
      expect(button).toHaveClass("text-primary");
    });
  });

  describe("Dark Mode Color Consistency", () => {
    test("should use semantic color tokens that adapt to dark mode", () => {
      renderWithDarkTheme(
        <Button data-testid="semantic-button">Semantic Button</Button>,
      );

      const button = screen.getByTestId("semantic-button");

      // Should use semantic tokens instead of hard-coded colors
      expect(button).toHaveClass("bg-primary");
      expect(button).toHaveClass("text-primary-foreground");
      expect(button).not.toHaveClass("bg-orange-600");
      expect(button).not.toHaveClass("text-white");

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");
    });

    test("focus states should work properly in dark mode", () => {
      renderWithDarkTheme(
        <Button data-testid="focus-button">Focus Test</Button>,
      );

      const button = screen.getByTestId("focus-button");

      // Should have focus ring that works in dark mode
      expect(button).toHaveClass("focus-visible:ring-2");
      expect(button).toHaveClass("focus-visible:ring-ring");
      expect(button).toHaveClass("focus-visible:ring-offset-2");
    });

    test("disabled state should work properly in dark mode", () => {
      renderWithDarkTheme(
        <Button data-testid="disabled-button" disabled>
          Disabled Button
        </Button>,
      );

      const button = screen.getByTestId("disabled-button");

      // Should have proper disabled styling
      expect(button).toBeDisabled();
      expect(button).toHaveClass("disabled:opacity-50");
      expect(button).toHaveClass("disabled:pointer-events-none");
    });
  });

  describe("Dark Mode Animation Support", () => {
    test("should maintain hover animations in dark mode", () => {
      renderWithDarkTheme(
        <Button data-testid="animated-button">Animated Button</Button>,
      );

      const button = screen.getByTestId("animated-button");

      // Should have hover animations
      expect(button).toHaveClass("hover:-translate-y-0.5");
      expect(button).toHaveClass("hover:shadow-lg");
      expect(button).toHaveClass("transition-all");
      expect(button).toHaveClass("duration-300");
    });

    test("should have proper active state in dark mode", () => {
      renderWithDarkTheme(
        <Button data-testid="active-button">Active Button</Button>,
      );

      const button = screen.getByTestId("active-button");

      // Should have active state styling
      expect(button).toHaveClass("active:translate-y-0");
      expect(button).toHaveClass("active:shadow-sm");
    });
  });

  describe("Dark Mode Size Variants", () => {
    test("small size should work properly in dark mode", () => {
      renderWithDarkTheme(
        <Button data-testid="small-button" size="sm">
          Small Button
        </Button>,
      );

      const button = screen.getByTestId("small-button");

      // Should have small size classes
      expect(button).toHaveClass("h-8");
      expect(button).toHaveClass("px-3");

      // Should still have dark mode shadows
      expect(button).toHaveClass("dark:shadow-purple-500/20");
    });

    test("large size should work properly in dark mode", () => {
      renderWithDarkTheme(
        <Button data-testid="large-button" size="lg">
          Large Button
        </Button>,
      );

      const button = screen.getByTestId("large-button");

      // Should have large size classes
      expect(button).toHaveClass("h-10");
      expect(button).toHaveClass("px-8");

      // Should still have dark mode shadows
      expect(button).toHaveClass("dark:shadow-purple-500/20");
    });

    test("icon size should work properly in dark mode", () => {
      renderWithDarkTheme(
        <Button data-testid="icon-button" size="icon">
          ⚡
        </Button>,
      );

      const button = screen.getByTestId("icon-button");

      // Should have icon size classes
      expect(button).toHaveClass("h-9");
      expect(button).toHaveClass("w-9");

      // Should still have dark mode shadows
      expect(button).toHaveClass("dark:shadow-purple-500/20");
    });
  });

  describe("Dark Mode Custom Classes", () => {
    test("should support custom dark mode classes", () => {
      renderWithDarkTheme(
        <Button
          data-testid="custom-button"
          className="dark:bg-green-700 dark:hover:bg-green-800"
        >
          Custom Dark Button
        </Button>,
      );

      const button = screen.getByTestId("custom-button");

      // Should preserve custom dark mode classes
      expect(button).toHaveClass("dark:bg-green-700");
      expect(button).toHaveClass("dark:hover:bg-green-800");

      // Should still have base button classes
      expect(button).toHaveClass("inline-flex");
      expect(button).toHaveClass("items-center");
      expect(button).toHaveClass("justify-center");
    });

    test("should work with asChild prop in dark mode", () => {
      renderWithDarkTheme(
        <Button data-testid="as-child-button" asChild>
          <a href="/test">Link as Button</a>
        </Button>,
      );

      const link = screen.getByTestId("as-child-button");

      // Should render as link but with button styling
      expect(link.tagName.toLowerCase()).toBe("a");
      expect(link).toHaveAttribute("href", "/test");

      // Should have button classes including dark mode support
      expect(link).toHaveClass("bg-primary");
      expect(link).toHaveClass("dark:shadow-purple-500/20");
    });
  });
});
