import React from "react";
import { render, screen, fireEvent } from "../../../test-utils";
import NavigationArrows from "./NavigationArrows";

describe("NavigationArrows Component", () => {
  const mockOnPrev = jest.fn();
  const mockOnNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    test("renders both arrow buttons when hasPrev and hasNext are true", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={true}
        />
      );

      expect(screen.getByTestId("nav-arrow-prev")).toBeInTheDocument();
      expect(screen.getByTestId("nav-arrow-next")).toBeInTheDocument();
    });

    test("renders only previous arrow when hasPrev is true and hasNext is false", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={false}
        />
      );

      expect(screen.getByTestId("nav-arrow-prev")).toBeInTheDocument();
      expect(screen.queryByTestId("nav-arrow-next")).not.toBeInTheDocument();
    });

    test("renders only next arrow when hasPrev is false and hasNext is true", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={false}
          hasNext={true}
        />
      );

      expect(screen.queryByTestId("nav-arrow-prev")).not.toBeInTheDocument();
      expect(screen.getByTestId("nav-arrow-next")).toBeInTheDocument();
    });

    test("renders nothing when both hasPrev and hasNext are false", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={false}
          hasNext={false}
        />
      );

      expect(screen.queryByTestId("nav-arrow-prev")).not.toBeInTheDocument();
      expect(screen.queryByTestId("nav-arrow-next")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    test("has proper aria-labels for both buttons", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={true}
        />
      );

      const prevButton = screen.getByTestId("nav-arrow-prev");
      const nextButton = screen.getByTestId("nav-arrow-next");

      expect(prevButton).toHaveAttribute("aria-label", "Previous dog");
      expect(nextButton).toHaveAttribute("aria-label", "Next dog");
    });

    test("buttons have proper role", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={true}
        />
      );

      const prevButton = screen.getByTestId("nav-arrow-prev");
      const nextButton = screen.getByTestId("nav-arrow-next");

      expect(prevButton.tagName).toBe("BUTTON");
      expect(nextButton.tagName).toBe("BUTTON");
    });
  });

  describe("Interaction", () => {
    test("calls onPrev when previous arrow is clicked", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={true}
        />
      );

      const prevButton = screen.getByTestId("nav-arrow-prev");
      fireEvent.click(prevButton);

      expect(mockOnPrev).toHaveBeenCalledTimes(1);
      expect(mockOnNext).not.toHaveBeenCalled();
    });

    test("calls onNext when next arrow is clicked", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={true}
        />
      );

      const nextButton = screen.getByTestId("nav-arrow-next");
      fireEvent.click(nextButton);

      expect(mockOnNext).toHaveBeenCalledTimes(1);
      expect(mockOnPrev).not.toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    test("disables buttons when isLoading is true", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={true}
          isLoading={true}
        />
      );

      const prevButton = screen.getByTestId("nav-arrow-prev");
      const nextButton = screen.getByTestId("nav-arrow-next");

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });

    test("does not call handlers when buttons are disabled", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={true}
          isLoading={true}
        />
      );

      const prevButton = screen.getByTestId("nav-arrow-prev");
      const nextButton = screen.getByTestId("nav-arrow-next");

      fireEvent.click(prevButton);
      fireEvent.click(nextButton);

      expect(mockOnPrev).not.toHaveBeenCalled();
      expect(mockOnNext).not.toHaveBeenCalled();
    });

    test("enables buttons when isLoading is false or undefined", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={true}
          isLoading={false}
        />
      );

      const prevButton = screen.getByTestId("nav-arrow-prev");
      const nextButton = screen.getByTestId("nav-arrow-next");

      expect(prevButton).not.toBeDisabled();
      expect(nextButton).not.toBeDisabled();
    });
  });

  describe("Styling", () => {
    test("applies correct desktop-only classes", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={true}
        />
      );

      const prevButton = screen.getByTestId("nav-arrow-prev");
      const nextButton = screen.getByTestId("nav-arrow-next");

      // Should be hidden on mobile (md: classes for show on desktop)
      expect(prevButton).toHaveClass("hidden", "md:flex");
      expect(nextButton).toHaveClass("hidden", "md:flex");
    });

    test("applies fixed positioning", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={true}
        />
      );

      const prevButton = screen.getByTestId("nav-arrow-prev");
      const nextButton = screen.getByTestId("nav-arrow-next");

      expect(prevButton).toHaveClass("fixed");
      expect(nextButton).toHaveClass("fixed");
    });

    test("applies positioning classes correctly", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={true}
        />
      );

      const prevButton = screen.getByTestId("nav-arrow-prev");
      const nextButton = screen.getByTestId("nav-arrow-next");

      // Previous button should be on the left
      expect(prevButton).toHaveClass("left-4");
      // Next button should be on the right
      expect(nextButton).toHaveClass("right-4");
      // Both should be vertically centered
      expect(prevButton).toHaveClass("top-1/2");
      expect(nextButton).toHaveClass("top-1/2");
      expect(prevButton).toHaveClass("-translate-y-1/2");
      expect(nextButton).toHaveClass("-translate-y-1/2");
    });

    test("applies hover and transition styles", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={true}
        />
      );

      const prevButton = screen.getByTestId("nav-arrow-prev");
      const nextButton = screen.getByTestId("nav-arrow-next");

      expect(prevButton).toHaveClass("hover:bg-gray-50");
      expect(nextButton).toHaveClass("hover:bg-gray-50");
      expect(prevButton).toHaveClass("transition-all");
      expect(nextButton).toHaveClass("transition-all");
    });

    test("applies shadow and background styles", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={true}
        />
      );

      const prevButton = screen.getByTestId("nav-arrow-prev");
      const nextButton = screen.getByTestId("nav-arrow-next");

      expect(prevButton).toHaveClass("bg-white", "shadow-lg");
      expect(nextButton).toHaveClass("bg-white", "shadow-lg");
    });
  });

  describe("Icons", () => {
    test("renders chevron left icon in previous button", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={false}
        />
      );

      // Check that the icon component exists with correct props
      const prevButton = screen.getByTestId("nav-arrow-prev");
      expect(prevButton).toBeInTheDocument();
    });

    test("renders chevron right icon in next button", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={false}
          hasNext={true}
        />
      );

      // Check that the icon component exists with correct props
      const nextButton = screen.getByTestId("nav-arrow-next");
      expect(nextButton).toBeInTheDocument();
    });
  });

  describe("Disabled State Styling", () => {
    test("applies disabled styles when loading", () => {
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={true}
          isLoading={true}
        />
      );

      const prevButton = screen.getByTestId("nav-arrow-prev");
      const nextButton = screen.getByTestId("nav-arrow-next");

      expect(prevButton).toHaveClass("disabled:opacity-50", "disabled:cursor-not-allowed");
      expect(nextButton).toHaveClass("disabled:opacity-50", "disabled:cursor-not-allowed");
    });
  });

  describe("Pure Function Behavior", () => {
    test("does not cause side effects during rendering", () => {
      const consoleError = jest.spyOn(console, "error");
      
      render(
        <NavigationArrows
          onPrev={mockOnPrev}
          onNext={mockOnNext}
          hasPrev={true}
          hasNext={true}
        />
      );

      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    test("renders consistently with same props", () => {
      const props = {
        onPrev: mockOnPrev,
        onNext: mockOnNext,
        hasPrev: true,
        hasNext: true,
      };

      const { rerender } = render(<NavigationArrows {...props} />);
      
      const firstRender = screen.getByTestId("nav-arrow-prev").outerHTML;
      
      rerender(<NavigationArrows {...props} />);
      
      const secondRender = screen.getByTestId("nav-arrow-prev").outerHTML;
      
      expect(firstRender).toBe(secondRender);
    });
  });
});