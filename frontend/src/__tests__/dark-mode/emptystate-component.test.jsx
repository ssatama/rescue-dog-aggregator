import React from "react";
import { render, screen } from "../../test-utils";
import { ThemeProvider } from "../../components/providers/ThemeProvider";
import EmptyState from "../../components/ui/EmptyState";

// Helper to render with ThemeProvider in dark mode
const renderWithDarkTheme = (component) => {
  // Set dark mode in localStorage
  localStorage.setItem("theme", "dark");
  document.documentElement.classList.add("dark");

  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe("EmptyState Component - Dark Mode Support", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  describe("Background Colors Dark Mode", () => {
    test("should use semantic background instead of hard-coded orange gradient in dark mode", () => {
      renderWithDarkTheme(<EmptyState variant="default" />);

      const emptyStateContainer = screen.getByTestId("empty-state");

      // Should have dark mode variants for orange gradients
      expect(emptyStateContainer.className).toMatch(
        /dark:from-orange-950|dark:from-orange-900/,
      );
      expect(emptyStateContainer.className).toMatch(
        /dark:to-orange-900|dark:to-orange-800/,
      );
    });

    test("should use semantic border color instead of hard-coded orange-200 in dark mode", () => {
      renderWithDarkTheme(<EmptyState variant="noDogsFiltered" />);

      const emptyStateContainer = screen.getByTestId("empty-state");

      // Should have dark mode variant for orange border
      expect(emptyStateContainer.className).toMatch(
        /dark:border-orange-800|dark:border-orange-900/,
      );
    });
  });

  describe("Text Colors Dark Mode", () => {
    test("should use semantic colors for title instead of hard-coded gray-900 in dark mode", () => {
      renderWithDarkTheme(<EmptyState variant="default" />);

      // Find the title element
      const titleElement = screen.getByText("No items found");

      // Should not use hard-coded gray-900 color
      expect(titleElement.className).not.toMatch(/text-gray-900(?!\s+dark:)/);

      // Should use semantic color or dark mode variant
      expect(titleElement.className).toMatch(/text-foreground|dark:text-/);
    });

    test("should use semantic colors for description instead of hard-coded gray-700 in dark mode", () => {
      renderWithDarkTheme(<EmptyState variant="default" />);

      // Find the description element
      const descriptionElement = screen.getByText(
        /There are no items to display/,
      );

      // Should not use hard-coded gray-700 color
      expect(descriptionElement.className).not.toMatch(
        /text-gray-700(?!\s+dark:)/,
      );

      // Should use semantic color or dark mode variant
      expect(descriptionElement.className).toMatch(
        /text-muted-foreground|dark:text-/,
      );
    });
  });

  describe("Icon Colors Dark Mode", () => {
    test("should use semantic colors for icons instead of hard-coded orange-400 in dark mode", () => {
      renderWithDarkTheme(<EmptyState variant="default" />);

      const iconElement = screen.getByTestId("empty-state-icon");

      // Should not use hard-coded orange-400 color without dark variant
      const iconClasses = iconElement.getAttribute("class") || "";
      expect(iconClasses).not.toMatch(/text-orange-400(?!\s+dark:)/);

      // Should use semantic color or dark mode variant for icons
      expect(iconClasses).toMatch(
        /text-orange-400.*dark:text-orange|dark:text-orange/,
      );
    });

    test("should handle different variant icons properly in dark mode", () => {
      const variants = [
        "noDogsFiltered",
        "noDogsOrganization",
        "noOrganizations",
        "default",
      ];

      variants.forEach((variant) => {
        const { unmount } = renderWithDarkTheme(
          <EmptyState variant={variant} />,
        );

        // Should be in dark mode context
        expect(document.documentElement).toHaveClass("dark");

        // Icon should be present and have proper styling
        const iconElement = screen.getByTestId("empty-state-icon");
        expect(iconElement).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe("Button Colors Dark Mode", () => {
    test("should handle action button colors properly in dark mode", () => {
      const mockAction = jest.fn();
      renderWithDarkTheme(
        <EmptyState variant="noDogsFiltered" onClearFilters={mockAction} />,
      );

      const actionButton = screen.getByRole("button", {
        name: /clear all filters/i,
      });

      // Should have proper orange gradient with dark mode support
      expect(actionButton.className).toMatch(/from-orange-600|to-orange-700/);
      expect(actionButton.className).toMatch(
        /hover:from-orange-700|hover:to-orange-800/,
      );

      // Should have proper focus ring for dark mode
      expect(actionButton.className).toMatch(
        /focus:ring-orange-600|dark:focus:ring-orange/,
      );
    });

    test("should handle custom action buttons properly in dark mode", () => {
      const customAction = {
        text: "Custom Action",
        onClick: jest.fn(),
        variant: "outline",
      };

      renderWithDarkTheme(
        <EmptyState variant="default" actionButton={customAction} />,
      );

      const actionButton = screen.getByRole("button", {
        name: /custom action/i,
      });
      expect(actionButton).toBeInTheDocument();

      // Custom button should work in dark mode (handled by shadcn Button component)
      expect(actionButton).toHaveClass("inline-flex");
    });
  });

  describe("Variant-Specific Dark Mode", () => {
    test("should handle noDogsFiltered variant properly in dark mode", () => {
      const mockClearFilters = jest.fn();
      renderWithDarkTheme(
        <EmptyState
          variant="noDogsFiltered"
          onClearFilters={mockClearFilters}
        />,
      );

      // Should display correct content
      expect(
        screen.getByText("No dogs match your filters"),
      ).toBeInTheDocument();
      expect(screen.getByText(/Don't worry!/)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /clear all filters/i }),
      ).toBeInTheDocument();

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");
    });

    test("should handle noDogsOrganization variant properly in dark mode", () => {
      const mockBrowseOrgs = jest.fn();
      renderWithDarkTheme(
        <EmptyState
          variant="noDogsOrganization"
          onBrowseOrganizations={mockBrowseOrgs}
        />,
      );

      // Should display correct content
      expect(
        screen.getByText("No dogs available right now"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/This organization doesn't have/),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /explore other rescues/i }),
      ).toBeInTheDocument();

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");
    });

    test("should handle noOrganizations variant properly in dark mode", () => {
      const mockRefresh = jest.fn();
      renderWithDarkTheme(
        <EmptyState variant="noOrganizations" onRefresh={mockRefresh} />,
      );

      // Should display correct content
      expect(screen.getByText("No organizations found")).toBeInTheDocument();
      expect(
        screen.getByText(/We couldn't find any rescue/),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /refresh page/i }),
      ).toBeInTheDocument();

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");
    });
  });

  describe("Custom Props Dark Mode", () => {
    test("should handle custom title and description properly in dark mode", () => {
      renderWithDarkTheme(
        <EmptyState
          variant="default"
          title="Custom Title"
          description="Custom description text"
        />,
      );

      const titleElement = screen.getByText("Custom Title");
      const descriptionElement = screen.getByText("Custom description text");

      // Should use semantic colors for custom content
      expect(titleElement.className).toMatch(/text-foreground|dark:text-/);
      expect(descriptionElement.className).toMatch(
        /text-muted-foreground|dark:text-/,
      );
    });

    test("should handle custom icon properly in dark mode", () => {
      const CustomIcon = ({ className, ...props }) => (
        <svg className={className} {...props} data-testid="custom-icon">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );

      renderWithDarkTheme(<EmptyState variant="default" icon={CustomIcon} />);

      const customIcon = screen.getByTestId("custom-icon");

      // Should apply the icon styling classes
      const customIconClasses = customIcon.getAttribute("class") || "";
      expect(customIconClasses).toMatch(/h-16|w-16|text-orange-400/);
    });

    test("should handle custom className properly in dark mode", () => {
      renderWithDarkTheme(
        <EmptyState variant="default" className="custom-class" />,
      );

      const emptyStateContainer = screen.getByTestId("empty-state");

      // Should include custom class
      expect(emptyStateContainer).toHaveClass("custom-class");

      // Should still have base dark mode styling
      expect(document.documentElement).toHaveClass("dark");
    });
  });

  describe("Animation Classes Dark Mode", () => {
    test("should preserve animation classes in dark mode", () => {
      renderWithDarkTheme(<EmptyState variant="default" />);

      const emptyStateContainer = screen.getByTestId("empty-state");

      // Should maintain animation classes
      expect(emptyStateContainer.className).toMatch(/animate-fade-in/);

      // Icon should have animation
      const iconElement = screen.getByTestId("empty-state-icon");
      const iconClasses = iconElement.getAttribute("class") || "";
      expect(iconClasses).toMatch(/animate-pulse-dot/);
    });
  });

  describe("Accessibility Dark Mode", () => {
    test("should maintain proper accessibility attributes in dark mode", () => {
      renderWithDarkTheme(<EmptyState variant="default" />);

      const emptyStateContainer = screen.getByTestId("empty-state");

      // Should have proper ARIA attributes
      expect(emptyStateContainer).toHaveAttribute("role", "status");
      expect(emptyStateContainer).toHaveAttribute("aria-label");

      // Should be accessible in dark mode
      expect(document.documentElement).toHaveClass("dark");
    });
  });

  describe("Dark Mode Integration", () => {
    test("should work cohesively with overall dark mode styling", () => {
      renderWithDarkTheme(
        <EmptyState variant="noDogsFiltered" onClearFilters={jest.fn()} />,
      );

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");

      const emptyStateContainer = screen.getByTestId("empty-state");
      expect(emptyStateContainer).toBeInTheDocument();

      // Should not have hard-coded colors that would break dark mode
      const allGrayElements = emptyStateContainer.querySelectorAll(
        '[class*="text-gray"]:not([class*="dark:"])',
      );

      // Should have minimal elements without dark mode support
      expect(allGrayElements.length).toBeLessThanOrEqual(2);

      // All major elements should be present and properly styled
      expect(screen.getByTestId("empty-state-icon")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });
});
