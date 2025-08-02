import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "../ThemeToggle";
import { ThemeProvider } from "../../providers/ThemeProvider";

// TypeScript-specific test to verify proper prop typing
describe("ThemeToggle TypeScript Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  test("accepts className prop with proper typing", () => {
    const customClass = "custom-theme-toggle";

    render(
      <ThemeProvider>
        <ThemeToggle className={customClass} />
      </ThemeProvider>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveClass(customClass);
  });

  test("accepts optional className prop", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  test("properly types component props interface", () => {
    // This test ensures the component properly accepts typed props
    const props = {
      className: "test-class",
    };

    render(
      <ThemeProvider>
        <ThemeToggle {...props} />
      </ThemeProvider>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveClass("test-class");
  });

  test("handles undefined className gracefully", () => {
    render(
      <ThemeProvider>
        <ThemeToggle className={undefined} />
      </ThemeProvider>,
    );

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });
});
