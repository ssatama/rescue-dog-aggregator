import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import MobileTopHeader from "../MobileTopHeader";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock next/image
interface MockImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
}

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: MockImageProps) => {
    return <img {...props} />;
  },
}));

describe("MobileTopHeader", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    test("renders the site name", () => {
      render(<MobileTopHeader />);

      const siteName = screen.getByText("Rescue Dog Aggregator");
      expect(siteName).toBeInTheDocument();
    });

    test("renders the tagline", () => {
      render(<MobileTopHeader />);

      const tagline = screen.getByText("Your gateway to European rescue dogs");
      expect(tagline).toBeInTheDocument();
    });

    test("renders the logo image", () => {
      render(<MobileTopHeader />);

      const logo = screen.getByAltText("Rescue Dog Logo");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("width", "40");
      expect(logo).toHaveAttribute("height", "40");
    });

    test("does not render search or favorites buttons", () => {
      render(<MobileTopHeader />);

      const searchButton = screen.queryByRole("button", { name: /search/i });
      const favoritesButton = screen.queryByRole("button", {
        name: /favorites/i,
      });
      expect(searchButton).not.toBeInTheDocument();
      expect(favoritesButton).not.toBeInTheDocument();
    });

    it("is hidden on desktop viewports (md and above)", () => {
      const { container } = render(<MobileTopHeader />);

      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass("sm:hidden");
    });

    it("has sticky positioning", () => {
      const { container } = render(<MobileTopHeader />);

      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass("sticky");
      expect(header).toHaveClass("top-0");
    });

    it("has backdrop blur effect", () => {
      const { container } = render(<MobileTopHeader />);

      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass("backdrop-blur-md");
    });

    it("has proper z-index for layering", () => {
      const { container } = render(<MobileTopHeader />);

      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass("z-40");
    });
  });

  describe("Layout", () => {
    test("logo and text are in a flex container", () => {
      const { container } = render(<MobileTopHeader />);

      const flexContainer = container.querySelector(".flex.items-center.gap-2");
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    test("logo has proper alt text", () => {
      render(<MobileTopHeader />);

      const logo = screen.getByAltText("Rescue Dog Logo");
      expect(logo).toBeInTheDocument();
    });

    test("header uses semantic HTML", () => {
      render(<MobileTopHeader />);

      const header = screen.getByRole("banner");
      expect(header).toBeInTheDocument();
    });
  });

  describe("Dark Mode", () => {
    it("has dark mode classes for background", () => {
      const { container } = render(<MobileTopHeader />);

      const header = container.firstChild as HTMLElement;
      expect(header.className).toMatch(/dark:bg-zinc-900/);
    });

    it("has dark mode classes for border", () => {
      const { container } = render(<MobileTopHeader />);

      const header = container.firstChild as HTMLElement;
      expect(header.className).toMatch(/dark:border-zinc-800/);
    });

    it("has dark mode classes for text", () => {
      render(<MobileTopHeader />);

      const heading = screen.getByText("Rescue Dog Aggregator");
      expect(heading.className).toMatch(/dark:text-zinc-50/);

      const tagline = screen.getByText("Your gateway to European rescue dogs");
      expect(tagline.className).toMatch(/dark:text-zinc-400/);
    });
  });

  describe("Safe Area Support", () => {
    it("has safe area padding for iOS devices", () => {
      const { container } = render(<MobileTopHeader />);

      const header = container.firstChild as HTMLElement;
      expect(header).toHaveStyle({
        paddingTop: "env(safe-area-inset-top, 0.75rem)",
      });
    });
  });
});
