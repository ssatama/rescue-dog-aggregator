import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileMenuDrawer } from "./MobileMenuDrawer";

// Mock framer-motion to avoid animation complexities in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, onClick, ...props }: any) => (
      <div onClick={onClick} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("MobileMenuDrawer", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  describe("Rendering", () => {
    it("should render drawer when isOpen is true", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should not render drawer when isOpen is false", () => {
      render(<MobileMenuDrawer isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Menu Items", () => {
    it("should contain Guides, Organizations, and About links", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole("link", { name: /guides/i })).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /organizations/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /about/i })).toBeInTheDocument();
    });

    it("should have correct href attributes", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole("link", { name: /guides/i })).toHaveAttribute(
        "href",
        "/guides",
      );
      expect(
        screen.getByRole("link", { name: /organizations/i }),
      ).toHaveAttribute("href", "/organizations");
      expect(screen.getByRole("link", { name: /about/i })).toHaveAttribute(
        "href",
        "/about",
      );
    });

    it("should include ThemeToggle component", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      // ThemeToggle should be present (we'll check for common theme toggle elements)
      expect(screen.getByText(/theme/i)).toBeInTheDocument();
    });
  });

  describe("Close Functionality", () => {
    it("should call onClose when close button is clicked", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole("button", { name: /close menu/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when backdrop is clicked", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      const backdrop = screen.getByTestId("menu-backdrop");
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should close menu when clicking a link", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      const guidesLink = screen.getByRole("link", { name: /guides/i });
      fireEvent.click(guidesLink);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("should have aria-modal attribute", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it("should have close button with accessible label", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole("button", { name: /close menu/i });
      expect(closeButton).toBeInTheDocument();
    });
  });
});
