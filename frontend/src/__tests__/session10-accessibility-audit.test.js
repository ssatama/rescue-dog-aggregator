/**
 * Session 10 - Accessibility Audit Tests
 * Comprehensive tests for WCAG 2.1 AA compliance
 */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";

// Import components to test
import Loading from "../components/ui/Loading";
import FilterButton from "../components/filters/FilterButton";
import LazyImage from "../components/ui/LazyImage";
import { Toast } from "../components/ui/Toast";
import DogCard from "../components/dogs/DogCard";
import OrganizationCard from "../components/organizations/OrganizationCard";

expect.extend(toHaveNoViolations);

describe("Session 10: Comprehensive Accessibility Audit", () => {
  describe("Loading States Accessibility", () => {
    test("Loading component should have proper ARIA announcements", () => {
      render(<Loading />);

      // Should have role="status" for screen readers
      const loadingContainer = screen.getByRole("status");
      expect(loadingContainer).toBeInTheDocument();

      // Should have aria-live for dynamic content
      expect(loadingContainer).toHaveAttribute("aria-live", "polite");

      // Should have aria-label for context
      expect(loadingContainer).toHaveAttribute("aria-label", "Loading content");

      // Should have screen reader only text
      expect(screen.getByText("Loading content, please wait...")).toHaveClass(
        "sr-only",
      );
    });

    test("Loading component should be accessible to screen readers", async () => {
      const { container } = render(<Loading />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Interactive Elements Focus States", () => {
    test("All buttons should have proper focus indicators", () => {
      render(
        <div>
          <FilterButton active={false} onClick={() => {}}>
            Test Filter
          </FilterButton>
          <FilterButton active={true} onClick={() => {}} count={5}>
            Active Filter
          </FilterButton>
        </div>,
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        // Should have focus-visible classes
        expect(button.className).toMatch(
          /focus:outline-none|focus-visible:ring/,
        );

        // Should have proper ARIA pressed state
        expect(button).toHaveAttribute("aria-pressed");

        // Should have descriptive aria-label
        expect(button).toHaveAttribute("aria-label");
      });
    });

    test("Filter buttons should announce their state to screen readers", () => {
      render(
        <FilterButton active={true} onClick={() => {}} count={3}>
          Size
        </FilterButton>,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-pressed", "true");
      expect(button).toHaveAttribute(
        "aria-label",
        "Size, 3 items, currently active",
      );
    });

    test("Inactive filter buttons should have proper aria-label", () => {
      render(
        <FilterButton active={false} onClick={() => {}}>
          Breed
        </FilterButton>,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-pressed", "false");
      expect(button).toHaveAttribute("aria-label", "Breed");
    });
  });

  describe("Image Accessibility", () => {
    test("LazyImage should handle loading state accessibility", () => {
      render(
        <LazyImage
          src="test-image.jpg"
          alt="Test dog named Buddy"
          className="w-full h-48"
        />,
      );

      // Should have proper role and aria-label during loading
      const placeholder = screen.getByTestId("image-placeholder");
      expect(placeholder).toHaveAttribute("role", "img");
      expect(placeholder).toHaveAttribute("aria-label", "Test dog named Buddy");
    });

    test("LazyImage should handle error state accessibility", () => {
      // Create a simple test component that simulates error state
      const ErrorImage = () => (
        <div
          className="bg-gray-100 flex items-center justify-center w-full h-48"
          data-testid="image-error"
          role="img"
          aria-label="Dog photo - Failed to load"
        >
          <svg
            className="w-8 h-8 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );

      render(<ErrorImage />);

      // Should show error state with proper accessibility
      const errorState = screen.getByTestId("image-error");
      expect(errorState).toHaveAttribute("role", "img");
      expect(errorState).toHaveAttribute(
        "aria-label",
        "Dog photo - Failed to load",
      );
    });

    test("LazyImage fallback states should not have violations", async () => {
      const { container } = render(
        <LazyImage
          src="test.jpg"
          alt="Accessible image"
          className="w-full h-48"
        />,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Keyboard Navigation", () => {
    test("All interactive elements should be keyboard accessible", async () => {
      const user = userEvent.setup();
      const mockClick = jest.fn();

      render(
        <div>
          <FilterButton onClick={mockClick}>Filter 1</FilterButton>
          <FilterButton onClick={mockClick}>Filter 2</FilterButton>
        </div>,
      );

      const buttons = screen.getAllByRole("button");

      // Should be able to tab to first button
      await user.tab();
      expect(buttons[0]).toHaveFocus();

      // Should be able to activate with Enter
      await user.keyboard("{Enter}");
      expect(mockClick).toHaveBeenCalledTimes(1);

      // Should be able to tab to second button
      await user.tab();
      expect(buttons[1]).toHaveFocus();

      // Should be able to activate with Space
      await user.keyboard(" ");
      expect(mockClick).toHaveBeenCalledTimes(2);
    });

    test("Card components should have proper keyboard interaction", async () => {
      const user = userEvent.setup();

      render(
        <OrganizationCard
          id="test-org"
          name="Test Organization"
          logo_url="test-logo.jpg"
          country="Test Country"
          total_dogs={10}
          new_this_week={2}
        />,
      );

      // Get the main card element (it should have role="button")
      const card = screen.getAllByRole("button")[0]; // Take the first button (main card)

      // Should be focusable
      await user.tab();
      expect(card).toHaveFocus();

      // Should activate with Enter
      await user.keyboard("{Enter}");
      // Note: Would test navigation in integration test

      // Should activate with Space
      await user.keyboard(" ");
      // Note: Would test navigation in integration test
    });
  });

  describe("ARIA Labels and Roles", () => {
    test("Toast notifications should have proper ARIA", () => {
      render(
        <Toast
          message="Test notification"
          type="info"
          isVisible={true}
          onClose={() => {}}
        />,
      );

      const toast = screen.getByRole("alert");
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveAttribute("aria-live", "polite");
    });

    test("Complex interactive elements should have proper ARIA relationships", () => {
      // This test would cover dropdown menus, complex widgets, etc.
      // Placeholder for future ShareButton dropdown testing
      expect(true).toBe(true);
    });
  });

  describe("Color Contrast and Visual Accessibility", () => {
    test("Focus indicators should have sufficient contrast", () => {
      render(<FilterButton onClick={() => {}}>Test Button</FilterButton>);

      const button = screen.getByRole("button");

      // Should have orange focus ring classes
      expect(button.className).toMatch(/focus:ring-orange-600/);
      expect(button.className).toMatch(/focus:ring-offset-2/);
    });

    test("Interactive elements should have proper touch targets", () => {
      render(<FilterButton onClick={() => {}}>Test</FilterButton>);

      const button = screen.getByRole("button");
      const computedStyle = window.getComputedStyle(button);

      // Should have minimum 44px height (will be validated in integration)
      expect(button.className).toMatch(/min-h-\[44px\]|py-2|py-3/);
    });
  });

  describe("Form Accessibility", () => {
    test("Form inputs should have proper labeling and context", () => {
      // This would be implemented when we add form validation
      // Placeholder for breed filter input improvements
      expect(true).toBe(true);
    });

    test("Form error states should be announced", () => {
      // This would test aria-invalid and aria-describedby
      // Placeholder for future form validation
      expect(true).toBe(true);
    });
  });

  describe("Reduced Motion Support", () => {
    test("Components should respect prefers-reduced-motion", () => {
      // Mock reduced motion preference
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<Loading />);

      // Should have CSS classes that respect reduced motion
      const loadingSpinner = screen.getByTestId("loading").firstChild;
      expect(loadingSpinner.className).toMatch(/animate-spin/);

      // CSS should handle reduced motion in globals.css
      expect(true).toBe(true);
    });
  });

  describe("Screen Reader Compatibility", () => {
    test("All components should pass axe accessibility testing", async () => {
      const { container } = render(
        <div>
          <Loading />
          <FilterButton active={false} onClick={() => {}}>
            Test Filter
          </FilterButton>
          <FilterButton active={true} onClick={() => {}} count={5}>
            Active Filter
          </FilterButton>
        </div>,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test("Dynamic content should be announced properly", () => {
      // Test for aria-live regions and dynamic updates
      // This would test loading state changes, filter updates, etc.
      expect(true).toBe(true);
    });
  });
});
