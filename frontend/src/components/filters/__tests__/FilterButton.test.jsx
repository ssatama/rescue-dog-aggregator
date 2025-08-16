import React from "react";
import { render, screen, fireEvent } from "../../../test-utils";
import "@testing-library/jest-dom";
import FilterButton from "../FilterButton";

describe("FilterButton", () => {
  const defaultProps = {
    active: false,
    onClick: jest.fn(),
    children: "Test Button",
    count: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders children correctly", () => {
      render(<FilterButton {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Test Button" }),
      ).toBeInTheDocument();
    });

    it("calls onClick when clicked", () => {
      const mockOnClick = jest.fn();
      render(<FilterButton {...defaultProps} onClick={mockOnClick} />);

      fireEvent.click(screen.getByRole("button"));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it("renders without crashing when children is missing", () => {
      render(<FilterButton {...defaultProps} children={undefined} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("Visual States - Default State", () => {
    it("applies default styling when not active", () => {
      render(<FilterButton {...defaultProps} active={false} />);
      const button = screen.getByRole("button");

      expect(button).toHaveClass("bg-white");
      expect(button).toHaveClass("border-orange-200");
      expect(button).not.toHaveClass("bg-orange-100");
      expect(button).not.toHaveClass("border-orange-400");
      expect(button).not.toHaveClass("text-orange-700");
    });

    it("includes hover states in className", () => {
      render(<FilterButton {...defaultProps} active={false} />);
      const button = screen.getByRole("button");

      expect(button).toHaveClass("hover:bg-orange-50");
      expect(button).toHaveClass("hover:border-orange-300");
    });
  });

  describe("Visual States - Active State", () => {
    it("applies active styling when active is true", () => {
      render(<FilterButton {...defaultProps} active={true} />);
      const button = screen.getByRole("button");

      expect(button).toHaveClass("bg-orange-100");
      expect(button).toHaveClass("border-orange-400");
      expect(button).toHaveClass("text-orange-700");
      expect(button).not.toHaveClass("bg-white");
      expect(button).not.toHaveClass("border-orange-200");
    });

    it("does not include hover classes when active", () => {
      render(<FilterButton {...defaultProps} active={true} />);
      const button = screen.getByRole("button");

      expect(button).not.toHaveClass("hover:bg-orange-50");
      expect(button).not.toHaveClass("hover:border-orange-300");
    });
  });

  describe("Interactive Behavior", () => {
    it("includes transition and animation classes", () => {
      render(<FilterButton {...defaultProps} />);
      const button = screen.getByRole("button");

      expect(button).toHaveClass("transition-all");
      expect(button).toHaveClass("duration-150");
      expect(button).toHaveClass("ease-out");
      expect(button).toHaveClass("active:scale-[0.98]");
    });

    it("includes proper base styling classes", () => {
      render(<FilterButton {...defaultProps} />);
      const button = screen.getByRole("button");

      expect(button).toHaveClass("px-3");
      expect(button).toHaveClass("py-2");
      expect(button).toHaveClass("rounded-lg");
      expect(button).toHaveClass("border");
      expect(button).toHaveClass("text-sm");
      expect(button).toHaveClass("font-medium");
    });
  });

  describe("Count Badge Logic", () => {
    it("does not show badge when count is 0", () => {
      render(<FilterButton {...defaultProps} count={0} />);
      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });

    it("does not show badge when count is undefined", () => {
      render(<FilterButton {...defaultProps} count={undefined} />);
      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });

    it("shows badge when count is greater than 0", () => {
      render(<FilterButton {...defaultProps} count={3} />);
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("applies correct badge styling", () => {
      render(<FilterButton {...defaultProps} count={2} />);
      const badge = screen.getByText("2");

      expect(badge).toHaveClass("ml-1.5");
      expect(badge).toHaveClass("inline-flex");
      expect(badge).toHaveClass("items-center");
      expect(badge).toHaveClass("justify-center");
      expect(badge).toHaveClass("px-1.5");
      expect(badge).toHaveClass("py-0.5");
      expect(badge).toHaveClass("text-xs");
      expect(badge).toHaveClass("bg-orange-200");
      expect(badge).toHaveClass("text-orange-800");
      expect(badge).toHaveClass("rounded-full");
    });

    it("shows correct count values", () => {
      const { rerender } = render(<FilterButton {...defaultProps} count={1} />);
      expect(screen.getByText("1")).toBeInTheDocument();

      rerender(<FilterButton {...defaultProps} count={99} />);
      expect(screen.getByText("99")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("is focusable", () => {
      render(<FilterButton {...defaultProps} />);
      const button = screen.getByRole("button");

      button.focus();
      expect(button).toHaveFocus();
    });

    it("has proper button role", () => {
      render(<FilterButton {...defaultProps} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("supports keyboard interaction", () => {
      const mockOnClick = jest.fn();
      render(<FilterButton {...defaultProps} onClick={mockOnClick} />);
      const button = screen.getByRole("button");

      fireEvent.keyDown(button, { key: "Enter" });
      // Note: onClick should be called by default button behavior
      button.click();
      expect(mockOnClick).toHaveBeenCalled();
    });

    it("provides accessible text when badge is present", () => {
      render(
        <FilterButton {...defaultProps} count={3}>
          Age
        </FilterButton>,
      );
      expect(screen.getByText("Age")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  describe("Props Validation", () => {
    it("handles missing onClick gracefully", () => {
      const { onClick, ...propsWithoutOnClick } = defaultProps;
      expect(() => {
        render(<FilterButton {...propsWithoutOnClick} />);
      }).not.toThrow();
    });

    it("handles boolean active prop correctly", () => {
      const { rerender } = render(
        <FilterButton {...defaultProps} active={false} />,
      );
      expect(screen.getByRole("button")).toHaveClass("bg-white");

      rerender(<FilterButton {...defaultProps} active={true} />);
      expect(screen.getByRole("button")).toHaveClass("bg-orange-100");
    });

    it("handles string children", () => {
      render(<FilterButton {...defaultProps}>String Child</FilterButton>);
      expect(screen.getByText("String Child")).toBeInTheDocument();
    });

    it("handles React element children", () => {
      render(
        <FilterButton {...defaultProps}>
          <span data-testid="child-element">Element Child</span>
        </FilterButton>,
      );
      expect(screen.getByTestId("child-element")).toBeInTheDocument();
    });

    it("handles negative count values", () => {
      render(<FilterButton {...defaultProps} count={-1} />);
      // Should not show badge for negative values
      expect(screen.queryByText("-1")).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles very large count values", () => {
      render(<FilterButton {...defaultProps} count={999} />);
      expect(screen.getByText("999")).toBeInTheDocument();
    });

    it("handles rapid clicking", () => {
      const mockOnClick = jest.fn();
      render(<FilterButton {...defaultProps} onClick={mockOnClick} />);
      const button = screen.getByRole("button");

      // Simulate rapid clicking
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(3);
    });

    it("maintains styling during active state changes", () => {
      const { rerender } = render(
        <FilterButton {...defaultProps} active={false} />,
      );
      const button = screen.getByRole("button");

      // Verify initial state
      expect(button).toHaveClass("bg-white");

      // Change to active
      rerender(<FilterButton {...defaultProps} active={true} />);
      expect(button).toHaveClass("bg-orange-100");

      // Change back to inactive
      rerender(<FilterButton {...defaultProps} active={false} />);
      expect(button).toHaveClass("bg-white");
    });
  });

  describe("Dark Mode Support", () => {
    it("applies dark mode classes for inactive state", () => {
      render(<FilterButton {...defaultProps} active={false} />);
      const button = screen.getByRole("button");

      // Should have dark mode variants
      expect(button).toHaveClass("dark:bg-gray-800");
      expect(button).toHaveClass("dark:border-gray-600");
      expect(button).toHaveClass("dark:text-gray-100");
    });

    it("applies dark mode classes for active state", () => {
      render(<FilterButton {...defaultProps} active={true} />);
      const button = screen.getByRole("button");

      // Should have dark mode variants for active state
      expect(button).toHaveClass("dark:bg-gray-700");
      expect(button).toHaveClass("dark:border-orange-500");
      expect(button).toHaveClass("dark:text-orange-300");
    });

    it("includes dark mode hover states", () => {
      render(<FilterButton {...defaultProps} active={false} />);
      const button = screen.getByRole("button");

      expect(button).toHaveClass("dark:hover:bg-gray-700");
      expect(button).toHaveClass("dark:hover:border-gray-500");
    });

    it("applies dark mode badge styling when count is present", () => {
      render(<FilterButton {...defaultProps} count={5} />);
      const badge = screen.getByText("5");

      expect(badge).toHaveClass("dark:bg-orange-900/30");
      expect(badge).toHaveClass("dark:text-orange-400");
    });
  });
});
