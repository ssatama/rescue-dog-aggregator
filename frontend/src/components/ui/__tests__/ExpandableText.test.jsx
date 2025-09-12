import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ExpandableText from "../ExpandableText";

const LONG_TEXT =
  "This is a very long piece of text that should be truncated on mobile devices. It contains multiple sentences to demonstrate the truncation behavior. The text continues with more content here to ensure it's long enough to trigger truncation. We need even more text to properly test the truncation logic. This ensures that our component works correctly with realistic content lengths that users might encounter on the breed pages.";

const SHORT_TEXT = "This is short text that should not be truncated.";

describe("ExpandableText", () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    // Reset window width
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });

    // Mock matchMedia
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
    window.matchMedia = originalMatchMedia;
  });

  describe("Desktop behavior", () => {
    beforeEach(() => {
      window.innerWidth = 1024;
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === "(min-width: 1024px)",
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
    });

    it("shows full text on desktop without truncation", () => {
      render(<ExpandableText text={LONG_TEXT} />);

      expect(screen.getByText(LONG_TEXT)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /see more/i }),
      ).not.toBeInTheDocument();
    });

    it("renders with custom className", () => {
      const { container } = render(
        <ExpandableText text={LONG_TEXT} className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("Mobile behavior", () => {
    beforeEach(() => {
      window.innerWidth = 375;
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === "(max-width: 1023px)",
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
    });

    it("truncates long text on mobile with See more button", () => {
      render(<ExpandableText text={LONG_TEXT} />);

      const textElement = screen.getByTestId("expandable-text-content");
      expect(textElement).toHaveClass("line-clamp-4");
      expect(
        screen.getByRole("button", { name: /see more/i }),
      ).toBeInTheDocument();
    });

    it("does not show See more button for short text", () => {
      render(<ExpandableText text={SHORT_TEXT} />);

      expect(screen.getByText(SHORT_TEXT)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /see more/i }),
      ).not.toBeInTheDocument();
    });

    it("expands text when See more is clicked", async () => {
      render(<ExpandableText text={LONG_TEXT} />);

      const seeMoreButton = screen.getByRole("button", { name: /see more/i });
      fireEvent.click(seeMoreButton);

      await waitFor(() => {
        const textElement = screen.getByTestId("expandable-text-content");
        expect(textElement).not.toHaveClass("line-clamp-4");
        expect(
          screen.getByRole("button", { name: /see less/i }),
        ).toBeInTheDocument();
      });
    });

    it("collapses text when See less is clicked", async () => {
      render(<ExpandableText text={LONG_TEXT} />);

      // Expand first
      const seeMoreButton = screen.getByRole("button", { name: /see more/i });
      fireEvent.click(seeMoreButton);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /see less/i }),
        ).toBeInTheDocument();
      });

      // Then collapse
      const seeLessButton = screen.getByRole("button", { name: /see less/i });
      fireEvent.click(seeLessButton);

      await waitFor(() => {
        const textElement = screen.getByTestId("expandable-text-content");
        expect(textElement).toHaveClass("line-clamp-4");
        expect(
          screen.getByRole("button", { name: /see more/i }),
        ).toBeInTheDocument();
      });
    });

    it("has proper ARIA attributes for accessibility", () => {
      render(<ExpandableText text={LONG_TEXT} />);

      const textElement = screen.getByTestId("expandable-text-content");
      const button = screen.getByRole("button", { name: /see more/i });

      expect(textElement).toHaveAttribute("aria-expanded", "false");
      expect(button).toHaveAttribute("aria-controls");

      const controlsId = button.getAttribute("aria-controls");
      expect(textElement).toHaveAttribute("id", controlsId);
    });

    it("updates ARIA attributes when expanded", async () => {
      render(<ExpandableText text={LONG_TEXT} />);

      const button = screen.getByRole("button", { name: /see more/i });
      fireEvent.click(button);

      await waitFor(() => {
        const textElement = screen.getByTestId("expandable-text-content");
        expect(textElement).toHaveAttribute("aria-expanded", "true");
      });
    });
  });

  describe("Tablet behavior", () => {
    beforeEach(() => {
      window.innerWidth = 768;
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === "(max-width: 1023px)",
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
    });

    it("truncates text on tablet devices", () => {
      render(<ExpandableText text={LONG_TEXT} />);

      const textElement = screen.getByTestId("expandable-text-content");
      expect(textElement).toHaveClass("line-clamp-4");
      expect(
        screen.getByRole("button", { name: /see more/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Custom line clamp", () => {
    beforeEach(() => {
      window.innerWidth = 375;
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === "(max-width: 1023px)",
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
    });

    it("allows custom number of lines to show", () => {
      render(<ExpandableText text={LONG_TEXT} lines={2} />);

      const textElement = screen.getByTestId("expandable-text-content");
      expect(textElement).toHaveClass("line-clamp-2");
    });
  });

  describe("Responsive behavior", () => {
    it("responds to window resize from mobile to desktop", async () => {
      window.innerWidth = 375;
      const listeners = [];

      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: window.innerWidth >= 1024 && query === "(min-width: 1024px)",
        media: query,
        onchange: null,
        addEventListener: (event, handler) => listeners.push(handler),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const { rerender } = render(<ExpandableText text={LONG_TEXT} />);

      // Initially on mobile - should show See more button
      expect(
        screen.getByRole("button", { name: /see more/i }),
      ).toBeInTheDocument();

      // Simulate resize to desktop
      window.innerWidth = 1024;
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === "(min-width: 1024px)",
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      // Trigger media query change
      listeners.forEach((handler) => handler({ matches: true }));
      rerender(<ExpandableText text={LONG_TEXT} />);

      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: /see more/i }),
        ).not.toBeInTheDocument();
      });
    });
  });
});
