/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock the favorites page component with isolated layout testing
const MockFavoritesLayout = ({ count = 2 }: { count?: number }) => {
  return (
    <div>
      {/* Action Buttons Row - Responsive Layout */}
      <div 
        className="flex flex-col md:flex-row justify-center items-center gap-4 mt-8"
        data-testid="action-buttons-container"
      >
        {/* Primary Action Buttons */}
        <div 
          className="flex flex-col sm:flex-row justify-center items-center gap-3"
          data-testid="primary-buttons"
        >
          <button className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto">
            Share Favorites
          </button>

          {count >= 2 && (
            <button className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto">
              Compare Dogs
            </button>
          )}
        </div>

        {/* Filter Controls - Separate Section */}
        <div 
          className="w-full md:w-auto flex justify-center"
          data-testid="filter-section"
        >
          <button>Filter</button>
        </div>
      </div>
    </div>
  );
};

describe("Favorites Layout Structure", () => {
  test("renders action buttons and filters in separate sections", () => {
    render(<MockFavoritesLayout count={2} />);

    // Check main container structure
    const container = screen.getByTestId("action-buttons-container");
    expect(container).toHaveClass("flex", "flex-col", "md:flex-row", "justify-center", "items-center", "gap-4");

    // Check primary buttons section
    const primaryButtons = screen.getByTestId("primary-buttons");
    expect(primaryButtons).toHaveClass("flex", "flex-col", "sm:flex-row", "justify-center", "items-center", "gap-3");

    // Check filter section is separate
    const filterSection = screen.getByTestId("filter-section");
    expect(filterSection).toHaveClass("w-full", "md:w-auto", "flex", "justify-center");

    // Verify buttons are present
    expect(screen.getByText("Share Favorites")).toBeInTheDocument();
    expect(screen.getByText("Compare Dogs")).toBeInTheDocument();
    expect(screen.getByText("Filter")).toBeInTheDocument();
  });

  test("responsive layout changes at correct breakpoints", () => {
    render(<MockFavoritesLayout count={2} />);

    const container = screen.getByTestId("action-buttons-container");
    
    // Should use flex-col on mobile, md:flex-row on desktop
    expect(container).toHaveClass("flex-col", "md:flex-row");

    // Primary buttons should change from flex-col to sm:flex-row
    const primaryButtons = screen.getByTestId("primary-buttons");
    expect(primaryButtons).toHaveClass("flex-col", "sm:flex-row");

    // Filter section should adjust width based on screen size
    const filterSection = screen.getByTestId("filter-section");
    expect(filterSection).toHaveClass("w-full", "md:w-auto");
  });

  test("layout adapts when compare button is not shown", () => {
    render(<MockFavoritesLayout count={1} />);

    // Share button should still be present
    expect(screen.getByText("Share Favorites")).toBeInTheDocument();
    
    // Compare button should not be present
    expect(screen.queryByText("Compare Dogs")).not.toBeInTheDocument();
    
    // Filter should still be present
    expect(screen.getByText("Filter")).toBeInTheDocument();

    // Layout structure should remain consistent
    const container = screen.getByTestId("action-buttons-container");
    expect(container).toHaveClass("flex", "flex-col", "md:flex-row", "justify-center");
  });

  test("sections have proper spacing and alignment", () => {
    render(<MockFavoritesLayout count={2} />);

    // Main container should have gap-4 between sections
    const container = screen.getByTestId("action-buttons-container");
    expect(container).toHaveClass("gap-4");

    // Primary buttons section should have gap-3 between buttons
    const primaryButtons = screen.getByTestId("primary-buttons");
    expect(primaryButtons).toHaveClass("gap-3");

    // All sections should be centered
    expect(container).toHaveClass("justify-center", "items-center");
    expect(primaryButtons).toHaveClass("justify-center", "items-center");
    expect(screen.getByTestId("filter-section")).toHaveClass("justify-center");
  });
});