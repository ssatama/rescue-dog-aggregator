import React from "react";
import { render, screen, fireEvent } from "../../../test-utils";
import "@testing-library/jest-dom";
import EmptyState from "../EmptyState";

describe("EmptyState", () => {
  it("speaks plainly, with no emoji (#503)", () => {
    render(<EmptyState variant="noDogsFiltered" onClearFilters={() => {}} />);

    expect(screen.getByTestId("empty-state").textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });

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
        screen.getByText(/Try removing a filter or two/),
      ).toBeInTheDocument();

      const clearFiltersButton = screen.getByText(
        "Clear all filters",
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
        "Clear all filters",
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
        screen.getByText(/This rescue has no dogs listed right now/),
      ).toBeInTheDocument();

      const browseButton = screen.getByText("See other rescues");
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

      const browseButton = screen.getByText("See other rescues");
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

      expect(screen.getByText("No rescues to show")).toBeInTheDocument();
      expect(
        screen.getByText(/We couldn't load the rescues/),
      ).toBeInTheDocument();

      const refreshButton = screen.getByText("Try again");
      expect(refreshButton).toBeInTheDocument();
    });

    it("calls onRefresh when refresh button is clicked", () => {
      const mockRefresh = jest.fn();

      render(<EmptyState variant="noOrganizations" onRefresh={mockRefresh} />);

      const refreshButton = screen.getByText("Try again");
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

      const button = screen.getByText("Clear all filters");
      expect(button).toHaveAttribute("type", "button");
      expect(button).toHaveClass("focus-visible:ring-2");
    });

    it("maintains semantic HTML structure", () => {
      render(<EmptyState title="Test Title" description="Test description" />);

      const title = screen.getByText("Test Title");
      expect(title.tagName).toBe("H2");

      const description = screen.getByText("Test description");
      expect(description.tagName).toBe("P");
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
        screen.queryByText("Clear all filters"),
      ).not.toBeInTheDocument();
    });

    it("renders without action button when no callback provided", () => {
      render(
        <EmptyState variant="noDogsFiltered" onClearFilters={undefined} />,
      );

      expect(
        screen.queryByText("Clear all filters"),
      ).not.toBeInTheDocument();
    });
  });
});
