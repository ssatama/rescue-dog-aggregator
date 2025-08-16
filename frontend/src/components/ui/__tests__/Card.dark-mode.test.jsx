import React from "react";
import { render, screen } from "../../../test-utils";
import { ThemeProvider } from "../../providers/ThemeProvider";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "../card";

// Helper to render with ThemeProvider in dark mode
const renderWithDarkTheme = (component) => {
  // Set dark mode in localStorage
  localStorage.setItem("theme", "dark");
  document.documentElement.classList.add("dark");

  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe("Card Component - Dark Mode Support", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  describe("Card Base Component", () => {
    test("should render with dark mode background using semantic tokens", () => {
      renderWithDarkTheme(
        <Card data-testid="card">
          <p>Card content</p>
        </Card>,
      );

      const card = screen.getByTestId("card");

      // Should use semantic background token that adapts to dark mode
      expect(card).toHaveClass("bg-card");
      expect(card).not.toHaveClass("bg-white");

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");
    });

    test("should have proper shadow support in dark mode", () => {
      renderWithDarkTheme(
        <Card
          data-testid="card"
          className="dark:shadow-lg dark:shadow-purple-500/5"
        >
          <p>Card content</p>
        </Card>,
      );

      const card = screen.getByTestId("card");

      // Should maintain shadow classes for both light and dark mode
      expect(card).toHaveClass("shadow-sm");
      expect(card).toHaveClass("hover:shadow-md");
      expect(card).toHaveClass("dark:shadow-lg");
      expect(card).toHaveClass("dark:shadow-purple-500/5");
    });

    test("should maintain transition and hover effects in dark mode", () => {
      renderWithDarkTheme(
        <Card data-testid="card">
          <p>Card content</p>
        </Card>,
      );

      const card = screen.getByTestId("card");

      // Should have transition classes
      expect(card).toHaveClass("transition-shadow");
      expect(card).toHaveClass("duration-200");
      expect(card).toHaveClass("will-change-transform");

      // Should have hover effects
      expect(card).toHaveClass("hover:shadow-md");
    });

    test("should support custom classes in dark mode", () => {
      renderWithDarkTheme(
        <Card
          data-testid="card"
          className="custom-card-class dark:border-gray-700"
        >
          <p>Card content</p>
        </Card>,
      );

      const card = screen.getByTestId("card");

      // Should preserve custom classes
      expect(card).toHaveClass("custom-card-class");
      expect(card).toHaveClass("dark:border-gray-700");

      // Should still have base card classes
      expect(card).toHaveClass("rounded-lg");
      expect(card).toHaveClass("bg-card");
    });
  });

  describe("Card Sub-components", () => {
    test("CardHeader should render properly in dark mode", () => {
      renderWithDarkTheme(
        <Card>
          <CardHeader data-testid="card-header">
            <CardTitle>Test Title</CardTitle>
          </CardHeader>
        </Card>,
      );

      const header = screen.getByTestId("card-header");

      // Should have proper layout classes
      expect(header).toHaveClass("flex");
      expect(header).toHaveClass("flex-col");
      expect(header).toHaveClass("space-y-1.5");
      expect(header).toHaveClass("p-6");
    });

    test("CardTitle should use semantic typography in dark mode", () => {
      renderWithDarkTheme(
        <Card>
          <CardHeader>
            <CardTitle data-testid="card-title">Test Title</CardTitle>
          </CardHeader>
        </Card>,
      );

      const title = screen.getByTestId("card-title");

      // Should use semantic text class that adapts to dark mode
      expect(title).toHaveClass("text-card-title");
    });

    test("CardDescription should use semantic foreground color in dark mode", () => {
      renderWithDarkTheme(
        <Card>
          <CardHeader>
            <CardDescription data-testid="card-description">
              Test description
            </CardDescription>
          </CardHeader>
        </Card>,
      );

      const description = screen.getByTestId("card-description");

      // Should use semantic text color that adapts to dark mode
      expect(description).toHaveClass("text-muted-foreground");
    });

    test("CardContent should render properly in dark mode", () => {
      renderWithDarkTheme(
        <Card>
          <CardContent data-testid="card-content">
            <p>Content text</p>
          </CardContent>
        </Card>,
      );

      const content = screen.getByTestId("card-content");

      // Should have proper padding
      expect(content).toHaveClass("p-6");
      expect(content).toHaveClass("pt-0");
    });

    test("CardFooter should render properly in dark mode", () => {
      renderWithDarkTheme(
        <Card>
          <CardFooter data-testid="card-footer">
            <button>Action</button>
          </CardFooter>
        </Card>,
      );

      const footer = screen.getByTestId("card-footer");

      // Should have proper layout and padding
      expect(footer).toHaveClass("flex");
      expect(footer).toHaveClass("items-center");
      expect(footer).toHaveClass("p-6");
      expect(footer).toHaveClass("pt-0");
    });
  });

  describe("Card Composition", () => {
    test("complete card should render properly in dark mode", () => {
      renderWithDarkTheme(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>,
      );

      const card = screen.getByTestId("complete-card");

      // Should use semantic background that works in both themes
      expect(card).toHaveClass("bg-card");
      expect(card).not.toHaveClass("bg-white");

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");

      // All text content should be present
      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test description")).toBeInTheDocument();
      expect(screen.getByText("Main content")).toBeInTheDocument();
      expect(screen.getByText("Action")).toBeInTheDocument();
    });
  });
});
