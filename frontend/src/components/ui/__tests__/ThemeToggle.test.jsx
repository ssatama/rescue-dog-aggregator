import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "../ThemeToggle";
import { ThemeProvider } from "../../providers/ThemeProvider";

// Helper to render with ThemeProvider
const renderWithTheme = (component, initialTheme = "light") => {
  if (initialTheme === "dark") {
    localStorage.setItem("theme", "dark");
  }
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  test("renders moon icon when theme is light", () => {
    renderWithTheme(<ThemeToggle />);

    const button = screen.getByRole("button", { name: /switch to dark mode/i });
    expect(button).toBeInTheDocument();

    // Check for moon icon by verifying SVG is present and has proper classes
    const icon = button.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("w-5", "h-5");
  });

  test("renders sun icon when theme is dark", () => {
    renderWithTheme(<ThemeToggle />, "dark");

    const button = screen.getByRole("button", {
      name: /switch to light mode/i,
    });
    expect(button).toBeInTheDocument();

    // Check for sun icon by verifying SVG is present and has proper classes
    const icon = button.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("w-5", "h-5");
  });

  test("toggles theme when clicked", () => {
    renderWithTheme(<ThemeToggle />);

    const button = screen.getByRole("button", { name: /switch to dark mode/i });

    // Initially should show icon for light theme (moon)
    const initialIcon = button.querySelector("svg");
    expect(initialIcon).toBeInTheDocument();

    // Click to switch to dark theme
    fireEvent.click(button);

    // Should now show sun icon and update aria-label
    expect(
      screen.getByRole("button", { name: /switch to light mode/i }),
    ).toBeInTheDocument();

    const newIcon = button.querySelector("svg");
    expect(newIcon).toBeInTheDocument();
    expect(newIcon).toHaveClass("w-5", "h-5");

    // Verify localStorage was updated
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  test("applies custom className when provided", () => {
    renderWithTheme(<ThemeToggle className="custom-class" />);

    const button = screen.getByRole("button", { name: /switch to dark mode/i });
    expect(button).toHaveClass("custom-class");
  });

  test("has proper focus and hover styles", () => {
    renderWithTheme(<ThemeToggle />);

    const button = screen.getByRole("button", { name: /switch to dark mode/i });

    // Check for base classes
    expect(button).toHaveClass("p-2");
    expect(button).toHaveClass("rounded-lg");
    expect(button).toHaveClass("transition-colors");

    // Check for hover classes
    expect(button).toHaveClass("hover:bg-gray-100");
    expect(button).toHaveClass("dark:hover:bg-gray-800");

    // Check for focus classes
    expect(button).toHaveClass("focus-visible:outline-none");
    expect(button).toHaveClass("focus-visible:ring-2");
    expect(button).toHaveClass("focus-visible:ring-orange-600");
  });

  test("icon has proper size classes", () => {
    renderWithTheme(<ThemeToggle />);

    const button = screen.getByRole("button", { name: /switch to dark mode/i });
    const icon = button.querySelector("svg");

    expect(icon).toHaveClass("w-5");
    expect(icon).toHaveClass("h-5");
  });
});
