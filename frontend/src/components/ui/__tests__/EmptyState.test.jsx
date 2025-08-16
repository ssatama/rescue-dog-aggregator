import React from "react";
import { render, screen, fireEvent } from "../../../test-utils";
import "@testing-library/jest-dom";
import EmptyState from "../EmptyState";

describe("EmptyState", () => {
  describe("Basic Rendering", () => {
    it("renders with default props", () => {
      render(<EmptyState />);

      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toBeInTheDocument();
    });

    it("renders with custom title and description", () => {
      const title = "Custom Title";
      const description = "Custom description text";

      render(<EmptyState title={title} description={description} />);

      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.getByText(description)).toBeInTheDocument();
    });
  });

  describe("Variant: No Dogs Filtered", () => {
    it("renders correct content for noDogsFiltered variant", () => {
      const mockClearFilters = jest.fn();
      render(
        <EmptyState
          variant="noDogsFiltered"
          onClearFilters={mockClearFilters}
        />,
      );

      expect(
        screen.getByText("No dogs match your filters"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Try adjusting your search criteria/),
      ).toBeInTheDocument();

      const clearFiltersButton = screen.getByText(
        "Clear All Filters & Start Fresh",
      );
      expect(clearFiltersButton).toBeInTheDocument();
    });

    it("calls onClearFilters when clear filters button is clicked", () => {
      const mockClearFilters = jest.fn();

      render(
        <EmptyState
          variant="noDogsFiltered"
          onClearFilters={mockClearFilters}
        />,
      );

      const clearFiltersButton = screen.getByText(
        "Clear All Filters & Start Fresh",
      );
      fireEvent.click(clearFiltersButton);

      expect(mockClearFilters).toHaveBeenCalledTimes(1);
    });

    it("renders filter icon for noDogsFiltered variant", () => {
      render(<EmptyState variant="noDogsFiltered" />);

      const icon = screen.getByTestId("empty-state-icon");
      expect(icon).toBeInTheDocument();
      expect(icon.querySelector("path")).toHaveAttribute(
        "d",
        expect.stringContaining(
          "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z",
        ),
      );
    });
  });

  describe("Variant: No Dogs Organization", () => {
    it("renders correct content for noDogsOrganization variant", () => {
      const mockBrowseOrganizations = jest.fn();
      render(
        <EmptyState
          variant="noDogsOrganization"
          onBrowseOrganizations={mockBrowseOrganizations}
        />,
      );

      expect(
        screen.getByText("No dogs available right now"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/This organization doesn't have any dogs/),
      ).toBeInTheDocument();

      const browseButton = screen.getByText("Explore Other Rescues");
      expect(browseButton).toBeInTheDocument();
    });

    it("calls onBrowseOrganizations when browse button is clicked", () => {
      const mockBrowseOrganizations = jest.fn();

      render(
        <EmptyState
          variant="noDogsOrganization"
          onBrowseOrganizations={mockBrowseOrganizations}
        />,
      );

      const browseButton = screen.getByText("Explore Other Rescues");
      fireEvent.click(browseButton);

      expect(mockBrowseOrganizations).toHaveBeenCalledTimes(1);
    });

    it("renders heart icon for noDogsOrganization variant", () => {
      render(<EmptyState variant="noDogsOrganization" />);

      const icon = screen.getByTestId("empty-state-icon");
      expect(icon).toBeInTheDocument();
      expect(icon.querySelector("path")).toHaveAttribute(
        "d",
        expect.stringContaining(
          "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
        ),
      );
    });
  });

  describe("Variant: No Organizations", () => {
    it("renders correct content for noOrganizations variant", () => {
      const mockRefresh = jest.fn();
      render(<EmptyState variant="noOrganizations" onRefresh={mockRefresh} />);

      expect(screen.getByText("No organizations found")).toBeInTheDocument();
      expect(
        screen.getByText(/We couldn't find any rescue organizations/),
      ).toBeInTheDocument();

      const refreshButton = screen.getByText("Refresh Page");
      expect(refreshButton).toBeInTheDocument();
    });

    it("calls onRefresh when refresh button is clicked", () => {
      const mockRefresh = jest.fn();

      render(<EmptyState variant="noOrganizations" onRefresh={mockRefresh} />);

      const refreshButton = screen.getByText("Refresh Page");
      fireEvent.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it("renders building icon for noOrganizations variant", () => {
      render(<EmptyState variant="noOrganizations" />);

      const icon = screen.getByTestId("empty-state-icon");
      expect(icon).toBeInTheDocument();
      expect(icon.querySelector("path")).toHaveAttribute(
        "d",
        expect.stringContaining(
          "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z",
        ),
      );
    });
  });

  describe("Custom Variants", () => {
    it("renders custom icon when provided", () => {
      const CustomIcon = () => (
        <svg data-testid="custom-icon">
          <path d="custom-path" />
        </svg>
      );

      render(<EmptyState icon={CustomIcon} />);

      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    });

    it("renders custom action button when provided", () => {
      const customActionProps = {
        text: "Custom Action",
        onClick: jest.fn(),
      };

      render(<EmptyState actionButton={customActionProps} />);

      const customButton = screen.getByText("Custom Action");
      expect(customButton).toBeInTheDocument();

      fireEvent.click(customButton);
      expect(customActionProps.onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Styling and Layout", () => {
    it("applies correct CSS classes for layout", () => {
      render(<EmptyState />);

      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toHaveClass(
        "bg-gradient-to-br",
        "from-orange-50",
        "to-orange-100/50",
        "rounded-xl",
        "p-8",
        "text-center",
        "border",
        "border-orange-200/50",
      );
    });

    it("renders icon with correct styling", () => {
      render(<EmptyState variant="noDogsFiltered" />);

      const icon = screen.getByTestId("empty-state-icon");
      expect(icon).toHaveClass(
        "h-16",
        "w-16",
        "mx-auto",
        "text-orange-400",
        "mb-2",
      );
    });

    it("renders title with correct styling", () => {
      render(<EmptyState title="Test Title" />);

      const title = screen.getByText("Test Title");
      expect(title).toHaveClass(
        "text-xl",
        "font-semibold",
        "text-foreground",
        "mb-3",
      );
    });

    it("renders description with correct styling", () => {
      render(<EmptyState description="Test description" />);

      const description = screen.getByText("Test description");
      expect(description).toHaveClass("text-muted-foreground", "mb-6");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      render(<EmptyState title="Test Title" />);

      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toHaveAttribute("role", "status");
      expect(emptyState).toHaveAttribute(
        "aria-label",
        "Empty state: Test Title",
      );
    });

    it("button has proper accessibility attributes", () => {
      const mockClearFilters = jest.fn();
      render(
        <EmptyState
          variant="noDogsFiltered"
          onClearFilters={mockClearFilters}
        />,
      );

      const button = screen.getByText("Clear All Filters & Start Fresh");
      expect(button).toHaveAttribute("type", "button");
      expect(button).toHaveClass(
        "focus:outline-none",
        "focus:ring-2",
        "focus:ring-orange-600",
      );
    });

    it("maintains semantic HTML structure", () => {
      render(<EmptyState title="Test Title" description="Test description" />);

      const title = screen.getByText("Test Title");
      expect(title.tagName).toBe("H3");

      const description = screen.getByText("Test description");
      expect(description.tagName).toBe("P");
    });
  });

  describe("Responsive Design", () => {
    it("maintains proper spacing on mobile and desktop", () => {
      render(<EmptyState />);

      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toHaveClass("p-8");
    });

    it("button has responsive styling", () => {
      const mockClearFilters = jest.fn();
      render(
        <EmptyState
          variant="noDogsFiltered"
          onClearFilters={mockClearFilters}
        />,
      );

      const button = screen.getByText("Clear All Filters & Start Fresh");
      expect(button).toHaveClass("px-6", "py-3", "rounded-lg");
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined variant gracefully", () => {
      render(<EmptyState variant={undefined} />);

      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toBeInTheDocument();
    });

    it("handles missing callback functions gracefully", () => {
      render(<EmptyState variant="noDogsFiltered" />);

      // Should not render button when no callback provided
      expect(
        screen.queryByText("Clear All Filters & Start Fresh"),
      ).not.toBeInTheDocument();
    });

    it("renders without action button when no callback provided", () => {
      render(
        <EmptyState variant="noDogsFiltered" onClearFilters={undefined} />,
      );

      expect(
        screen.queryByText("Clear All Filters & Start Fresh"),
      ).not.toBeInTheDocument();
    });
  });
});
