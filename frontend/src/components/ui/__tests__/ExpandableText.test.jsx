import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ExpandableText from "../ExpandableText";

const LONG_TEXT =
  "This is a very long piece of text that should be truncated on mobile devices. It contains multiple sentences to demonstrate the truncation behavior. The text continues with more content here to ensure it's long enough to trigger truncation. We need even more text to properly test the truncation logic. This ensures that our component works correctly with realistic content lengths that users might encounter on the breed pages.";

const SHORT_TEXT = "This is short text that should not be truncated.";

describe("ExpandableText", () => {
  describe("Rendering", () => {
    it("returns null when text is empty", () => {
      const { container } = render(<ExpandableText text="" />);
      expect(container.firstChild).toBeNull();
    });

    it("renders with custom className", () => {
      const { container } = render(
        <ExpandableText text={LONG_TEXT} className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("does not show See more button for short text", () => {
      render(<ExpandableText text={SHORT_TEXT} />);

      expect(screen.getByText(SHORT_TEXT)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /see more/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Truncation behavior", () => {
    it("truncates long text with See more button", () => {
      render(<ExpandableText text={LONG_TEXT} />);

      const textElement = screen.getByTestId("expandable-text-content");
      expect(textElement).toHaveClass("line-clamp-4");
      expect(
        screen.getByRole("button", { name: /see more/i }),
      ).toBeInTheDocument();
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

    it("allows custom number of lines to show", () => {
      render(<ExpandableText text={LONG_TEXT} lines={2} />);

      const textElement = screen.getByTestId("expandable-text-content");
      expect(textElement).toHaveClass("line-clamp-2");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes when truncated", () => {
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

    it("does not set aria-expanded on short text", () => {
      render(<ExpandableText text={SHORT_TEXT} />);

      const textElement = screen.getByTestId("expandable-text-content");
      expect(textElement).not.toHaveAttribute("aria-expanded");
    });
  });
});
