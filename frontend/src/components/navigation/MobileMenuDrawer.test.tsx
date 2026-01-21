import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileMenuDrawer } from "./MobileMenuDrawer";

// Mock framer-motion to avoid animation complexities in tests
interface MockMotionDivProps {
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  role?: string;
  "aria-modal"?: boolean | "true" | "false";
  "data-testid"?: string;
}

interface MockAnimatePresenceProps {
  children: React.ReactNode;
}

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, onClick, ...props }: MockMotionDivProps) => (
      <div onClick={onClick} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: MockAnimatePresenceProps) => <>{children}</>,
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
    it("should contain all Quick Filters links", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      expect(
        screen.getByRole("link", { name: /browse puppies/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /browse seniors/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /by country/i }),
      ).toBeInTheDocument();
    });

    it("should contain all Learn & Explore links", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole("link", { name: /guides/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /faq/i })).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /organizations/i }),
      ).toBeInTheDocument();
    });

    it("should contain About section link", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      expect(
        screen.getByRole("link", { name: /about us/i }),
      ).toBeInTheDocument();
    });

    it("should contain Privacy in footer area", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole("link", { name: /privacy/i })).toBeInTheDocument();
    });

    it("should have correct href attributes for Quick Filters", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      expect(
        screen.getByRole("link", { name: /browse puppies/i }),
      ).toHaveAttribute("href", "/dogs/puppies");
      expect(
        screen.getByRole("link", { name: /browse seniors/i }),
      ).toHaveAttribute("href", "/dogs/senior");
      expect(screen.getByRole("link", { name: /by country/i })).toHaveAttribute(
        "href",
        "/dogs/country",
      );
    });

    it("should have correct href attributes for Learn & Explore", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole("link", { name: /guides/i })).toHaveAttribute(
        "href",
        "/guides",
      );
      expect(screen.getByRole("link", { name: /faq/i })).toHaveAttribute(
        "href",
        "/faq",
      );
      expect(
        screen.getByRole("link", { name: /organizations/i }),
      ).toHaveAttribute("href", "/organizations");
    });

    it("should have correct href attributes for About and Footer", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole("link", { name: /about us/i })).toHaveAttribute(
        "href",
        "/about",
      );
      expect(screen.getByRole("link", { name: /privacy/i })).toHaveAttribute(
        "href",
        "/privacy",
      );
    });

    it("should display section headers", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText("Quick Filters")).toBeInTheDocument();
      expect(screen.getByText("Learn & Explore")).toBeInTheDocument();
      expect(screen.getByText("About")).toBeInTheDocument();
    });

    it("should include ThemeToggle component", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

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

      const puppiesLink = screen.getByRole("link", { name: /browse puppies/i });
      fireEvent.click(puppiesLink);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should close menu when clicking footer link", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      const privacyLink = screen.getByRole("link", { name: /privacy/i });
      fireEvent.click(privacyLink);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when Escape key is pressed", () => {
      render(<MobileMenuDrawer isOpen={true} onClose={mockOnClose} />);

      fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

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