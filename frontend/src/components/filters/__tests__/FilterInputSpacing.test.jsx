/**
 * Test suite for filter input spacing and icon collision prevention
 * Ensures placeholder text doesn't collide with search icons
 */

import React from "react";
import { render, screen } from "../../../test-utils";
import "@testing-library/jest-dom";
import SearchTypeahead from "../../search/SearchTypeahead";
import MobileFilterBottomSheet from "../MobileFilterBottomSheet";

describe("Filter Input Spacing - Icon Collision Prevention", () => {
  describe("SearchTypeahead Component", () => {
    test("has correct left padding class to prevent placeholder collision with icon", () => {
      render(
        <SearchTypeahead
          placeholder="Search dogs..."
          value=""
          onValueChange={jest.fn()}
        />
      );

      const input = screen.getByPlaceholderText("Search dogs...");
      
      // Check that pl-12 is applied (48px padding = icon at 12px + icon width 16px + 20px gap)
      expect(input.className).toContain("pl-12");
      expect(input.className).not.toContain("pl-10");
    });

    test("maintains proper spacing class with icon for breed search", () => {
      render(
        <SearchTypeahead
          placeholder="Search breeds..."
          value=""
          onValueChange={jest.fn()}
        />
      );

      const input = screen.getByPlaceholderText("Search breeds...");
      
      // Check that pl-12 is applied
      expect(input.className).toContain("pl-12");
      expect(input.className).not.toContain("pl-10");
    });

    test("icon is properly positioned within the input bounds", () => {
      const { container } = render(
        <SearchTypeahead
          placeholder="Search dogs..."
          value=""
          onValueChange={jest.fn()}
        />
      );

      // Find the icon container (should be positioned absolutely)
      const iconContainer = container.querySelector('div[class*="absolute"][class*="left-"]');
      
      expect(iconContainer).toBeInTheDocument();
      
      // Verify icon has absolute positioning class
      expect(iconContainer.className).toContain("absolute");
      expect(iconContainer.className).toContain("left-3");
    });

    test("clear button does not interfere with placeholder when input is empty", () => {
      render(
        <SearchTypeahead
          placeholder="Search dogs..."
          value=""
          onValueChange={jest.fn()}
          showClearButton={true}
        />
      );

      const input = screen.getByPlaceholderText("Search dogs...");
      
      // When input is empty, should use pr-4
      expect(input.className).toMatch(/pr-4/);
    });

    test("clear button has proper spacing when input has value", () => {
      render(
        <SearchTypeahead
          placeholder="Search dogs..."
          value="labrador"
          onValueChange={jest.fn()}
          showClearButton={true}
        />
      );

      const input = screen.getByPlaceholderText("Search dogs...");
      
      // When input has value, should use pr-20 for clear button
      expect(input.className).toMatch(/pr-20/);
      
      // Clear button should be visible
      const clearButton = screen.getByRole("button", { name: /clear search/i });
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe("MobileFilterBottomSheet Component - Direct Input Usage", () => {
    const mockProps = {
      isOpen: true,
      onClose: jest.fn(),
      filters: { breed: "" },
      onFiltersChange: jest.fn(),
      availableBreeds: ["Labrador", "Golden Retriever"],
      organizations: [],
      totalCount: 0,
      hasActiveFilters: false,
      onClearAll: jest.fn(),
      isOrganizationPage: false,
    };

    test("breed search input has correct left padding class to prevent icon collision", () => {
      render(<MobileFilterBottomSheet {...mockProps} />);

      const input = screen.getByPlaceholderText(/Search for specific breed/i);
      
      // Check that pl-12 is applied
      expect(input.className).toContain("pl-12");
      expect(input.className).not.toContain("pl-10");
    });

    test("icon is visible and properly positioned in breed search", () => {
      const { container } = render(<MobileFilterBottomSheet {...mockProps} />);

      // Find the breed input
      const breedInput = screen.getByPlaceholderText(/Search for specific breed/i);
      expect(breedInput).toBeInTheDocument();
      
      // The icon should be positioned absolutely within the relative container
      // We verify this by checking that the input's parent has position relative
      const inputContainer = breedInput.parentElement;
      expect(inputContainer).toBeInTheDocument();
      expect(inputContainer.className).toContain("relative");
      
      // Verify there's an SVG icon (search icon) in the section
      const svgIcons = inputContainer.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThan(0);
    });

    test("breed input maintains mobile-optimized min height", () => {
      render(<MobileFilterBottomSheet {...mockProps} />);

      const input = screen.getByPlaceholderText(/Search for specific breed/i);
      
      // Should have mobile-friendly touch target size
      expect(input.className).toContain("min-h-[48px]");
    });
  });

  describe("Responsive Behavior", () => {
    test("spacing class remains consistent across different sizes", () => {
      const { rerender } = render(
        <SearchTypeahead
          placeholder="Search dogs..."
          value=""
          onValueChange={jest.fn()}
          size="default"
        />
      );

      const inputDefault = screen.getByPlaceholderText("Search dogs...");
      expect(inputDefault.className).toContain("pl-12");

      rerender(
        <SearchTypeahead
          placeholder="Search dogs..."
          value=""
          onValueChange={jest.fn()}
          size="lg"
        />
      );

      const inputLg = screen.getByPlaceholderText("Search dogs...");
      expect(inputLg.className).toContain("pl-12");
    });

    test("small size variant also maintains proper spacing", () => {
      render(
        <SearchTypeahead
          placeholder="Search dogs..."
          value=""
          onValueChange={jest.fn()}
          size="sm"
        />
      );

      const input = screen.getByPlaceholderText("Search dogs...");
      expect(input.className).toContain("pl-12");
    });
  });

  describe("Accessibility", () => {
    test("input has proper ARIA attributes for combobox", () => {
      render(
        <SearchTypeahead
          placeholder="Search dogs..."
          value=""
          onValueChange={jest.fn()}
        />
      );

      const input = screen.getByPlaceholderText("Search dogs...");
      
      expect(input).toHaveAttribute("role", "combobox");
      expect(input).toHaveAttribute("aria-autocomplete", "list");
      expect(input).toHaveAttribute("aria-haspopup", "listbox");
    });

    test("MobileFilterBottomSheet breed input has aria-label", () => {
      const mockProps = {
        isOpen: true,
        onClose: jest.fn(),
        filters: { breed: "" },
        onFiltersChange: jest.fn(),
        availableBreeds: [],
        organizations: [],
        totalCount: 0,
        hasActiveFilters: false,
        onClearAll: jest.fn(),
        isOrganizationPage: false,
      };

      render(<MobileFilterBottomSheet {...mockProps} />);

      const input = screen.getByPlaceholderText(/Search for specific breed/i);
      expect(input).toHaveAttribute("aria-label", "Search for specific breed");
    });
  });
});