import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "../../providers/ThemeProvider";
import { Input } from "../input";

// Helper to render with ThemeProvider in dark mode
const renderWithDarkTheme = (component) => {
  // Set dark mode in localStorage
  localStorage.setItem("theme", "dark");
  document.documentElement.classList.add("dark");

  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe("Input Component - Dark Mode Support", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  describe("Dark Mode Styling", () => {
    test("should use semantic tokens that adapt to dark mode", () => {
      renderWithDarkTheme(
        <Input data-testid="semantic-input" placeholder="Enter text" />,
      );

      const input = screen.getByTestId("semantic-input");

      // Should use semantic border and background
      expect(input).toHaveClass("border-input");
      expect(input).toHaveClass("bg-transparent");

      // Should use semantic text colors
      expect(input).toHaveClass("placeholder:text-muted-foreground");

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");
    });

    test("should have enhanced focus state for dark mode", () => {
      renderWithDarkTheme(
        <Input data-testid="focus-input" placeholder="Focus me" />,
      );

      const input = screen.getByTestId("focus-input");

      // Should have dark mode focus enhancements
      expect(input).toHaveClass("focus-visible:ring-2");
      expect(input).toHaveClass("dark:focus-visible:ring-purple-500");
      expect(input).toHaveClass("dark:focus-visible:ring-offset-background");

      // Should still have base focus styling
      expect(input).toHaveClass("focus-visible:outline-none");
      expect(input).toHaveClass("focus-visible:ring-offset-2");
    });

    test("should have dark mode border styling", () => {
      renderWithDarkTheme(<Input data-testid="border-input" />);

      const input = screen.getByTestId("border-input");

      // Should have dark mode border enhancements
      expect(input).toHaveClass("dark:border-input/60");
      expect(input).toHaveClass("dark:shadow-purple-500/10");

      // Should use semantic border
      expect(input).toHaveClass("border-input");
    });

    test("should handle disabled state properly in dark mode", () => {
      renderWithDarkTheme(<Input data-testid="disabled-input" disabled />);

      const input = screen.getByTestId("disabled-input");

      // Should be disabled
      expect(input).toBeDisabled();

      // Should have proper disabled styling
      expect(input).toHaveClass("disabled:cursor-not-allowed");
      expect(input).toHaveClass("disabled:opacity-50");

      // Should have dark mode disabled enhancements
      expect(input).toHaveClass("dark:disabled:bg-muted/20");
    });
  });

  describe("Dark Mode Focus Behavior", () => {
    test("should show enhanced focus ring in dark mode", () => {
      renderWithDarkTheme(<Input data-testid="focus-test" />);

      const input = screen.getByTestId("focus-test");

      // Focus the input
      fireEvent.focus(input);

      // Should have focus classes
      expect(input).toHaveClass("focus-visible:ring-2");
      expect(input).toHaveClass("dark:focus-visible:ring-purple-500");
    });

    test("should handle focus with different input types in dark mode", () => {
      const inputTypes = ["text", "email", "password", "search", "tel", "url"];

      inputTypes.forEach((type, index) => {
        renderWithDarkTheme(
          <Input
            data-testid={`input-${type}`}
            type={type}
            placeholder={`Enter ${type}`}
          />,
        );

        const input = screen.getByTestId(`input-${type}`);

        // Should have proper type
        expect(input).toHaveAttribute("type", type);

        // Should have dark mode focus styling
        expect(input).toHaveClass("dark:focus-visible:ring-purple-500");
      });
    });
  });

  describe("Dark Mode Placeholder Styling", () => {
    test("should have proper placeholder contrast in dark mode", () => {
      renderWithDarkTheme(
        <Input
          data-testid="placeholder-input"
          placeholder="This is a placeholder"
        />,
      );

      const input = screen.getByTestId("placeholder-input");

      // Should use semantic placeholder color
      expect(input).toHaveClass("placeholder:text-muted-foreground");

      // Should have proper placeholder text
      expect(input).toHaveAttribute("placeholder", "This is a placeholder");
    });

    test("should handle empty placeholder in dark mode", () => {
      renderWithDarkTheme(<Input data-testid="no-placeholder" />);

      const input = screen.getByTestId("no-placeholder");

      // Should still have placeholder styling class
      expect(input).toHaveClass("placeholder:text-muted-foreground");

      // Should not have placeholder attribute
      expect(input).not.toHaveAttribute("placeholder");
    });
  });

  describe("Dark Mode File Input Support", () => {
    test("should handle file input styling in dark mode", () => {
      renderWithDarkTheme(
        <Input data-testid="file-input" type="file" accept="image/*" />,
      );

      const input = screen.getByTestId("file-input");

      // Should have file input styling
      expect(input).toHaveClass("file:border-0");
      expect(input).toHaveClass("file:bg-transparent");
      expect(input).toHaveClass("file:text-foreground");

      // Should have dark mode file styling
      expect(input).toHaveClass("dark:file:text-foreground");

      // Should be file input
      expect(input).toHaveAttribute("type", "file");
      expect(input).toHaveAttribute("accept", "image/*");
    });
  });

  describe("Dark Mode Responsive Design", () => {
    test("should have proper responsive text sizing in dark mode", () => {
      renderWithDarkTheme(<Input data-testid="responsive-input" />);

      const input = screen.getByTestId("responsive-input");

      // Should have responsive text sizing
      expect(input).toHaveClass("text-base");
      expect(input).toHaveClass("md:text-sm");
    });
  });

  describe("Dark Mode Accessibility", () => {
    test("should maintain accessibility in dark mode", () => {
      renderWithDarkTheme(
        <Input
          data-testid="accessible-input"
          aria-label="Search dogs"
          role="searchbox"
        />,
      );

      const input = screen.getByTestId("accessible-input");

      // Should have proper ARIA attributes
      expect(input).toHaveAttribute("aria-label", "Search dogs");
      expect(input).toHaveAttribute("role", "searchbox");

      // Should be accessible
      expect(input).toBeInTheDocument();
    });

    test("should work with form labels in dark mode", () => {
      renderWithDarkTheme(
        <div>
          <label htmlFor="labeled-input" className="dark:text-foreground">
            Dog Name
          </label>
          <Input
            data-testid="labeled-input"
            id="labeled-input"
            name="dogName"
          />
        </div>,
      );

      const input = screen.getByTestId("labeled-input");
      const label = screen.getByText("Dog Name");

      // Should be properly associated
      expect(input).toHaveAttribute("id", "labeled-input");
      expect(input).toHaveAttribute("name", "dogName");
      expect(label).toHaveAttribute("for", "labeled-input");
    });

    test("should support required attribute in dark mode", () => {
      renderWithDarkTheme(
        <Input data-testid="required-input" required aria-required="true" />,
      );

      const input = screen.getByTestId("required-input");

      // Should have required attributes
      expect(input).toBeRequired();
      expect(input).toHaveAttribute("aria-required", "true");
    });
  });

  describe("Dark Mode Custom Classes", () => {
    test("should support custom dark mode classes", () => {
      renderWithDarkTheme(
        <Input
          data-testid="custom-input"
          className="dark:bg-blue-950/50 dark:border-blue-500"
        />,
      );

      const input = screen.getByTestId("custom-input");

      // Should preserve custom dark mode classes
      expect(input).toHaveClass("dark:bg-blue-950/50");
      expect(input).toHaveClass("dark:border-blue-500");

      // Should still have base input classes
      expect(input).toHaveClass("flex");
      expect(input).toHaveClass("h-9");
      expect(input).toHaveClass("rounded-md");
    });

    test("should work with form styling classes in dark mode", () => {
      renderWithDarkTheme(
        <Input
          data-testid="form-input"
          className="w-full max-w-sm dark:ring-purple-500/20"
        />,
      );

      const input = screen.getByTestId("form-input");

      // Should preserve form styling
      expect(input).toHaveClass("w-full");
      expect(input).toHaveClass("max-w-sm");
      expect(input).toHaveClass("dark:ring-purple-500/20");
    });
  });

  describe("Dark Mode Error States", () => {
    test("should handle error styling in dark mode", () => {
      renderWithDarkTheme(
        <Input
          data-testid="error-input"
          className="dark:border-red-500 dark:focus-visible:ring-red-500"
          aria-invalid="true"
        />,
      );

      const input = screen.getByTestId("error-input");

      // Should have error styling
      expect(input).toHaveClass("dark:border-red-500");
      expect(input).toHaveClass("dark:focus-visible:ring-red-500");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    test("should handle success styling in dark mode", () => {
      renderWithDarkTheme(
        <Input
          data-testid="success-input"
          className="dark:border-green-500 dark:focus-visible:ring-green-500"
          aria-invalid="false"
        />,
      );

      const input = screen.getByTestId("success-input");

      // Should have success styling
      expect(input).toHaveClass("dark:border-green-500");
      expect(input).toHaveClass("dark:focus-visible:ring-green-500");
      expect(input).toHaveAttribute("aria-invalid", "false");
    });
  });

  describe("Dark Mode Integration", () => {
    test("should work well in dark mode forms", () => {
      renderWithDarkTheme(
        <form className="dark:bg-card p-4">
          <div className="space-y-4">
            <Input data-testid="form-name" placeholder="Dog name" />
            <Input data-testid="form-breed" placeholder="Breed" />
            <Input data-testid="form-age" type="number" placeholder="Age" />
          </div>
        </form>,
      );

      const nameInput = screen.getByTestId("form-name");
      const breedInput = screen.getByTestId("form-breed");
      const ageInput = screen.getByTestId("form-age");

      // All inputs should have consistent dark mode styling
      [nameInput, breedInput, ageInput].forEach((input) => {
        expect(input).toHaveClass("border-input");
        expect(input).toHaveClass("bg-transparent");
        expect(input).toHaveClass("dark:border-input/60");
        expect(input).toHaveClass("dark:focus-visible:ring-purple-500");
      });
    });
  });
});
