// frontend/src/components/home/__tests__/FinalCTA.test.tsx

import React from "react";
import { render, screen } from "../../../test-utils";
import FinalCTA from "../FinalCTA";

// Mock Next.js Link
interface MockLinkProps {
  children: React.ReactNode;
  href: string;
  className?: string;
}

jest.mock("next/link", () => {
  return function MockLink({ children, href, ...props }: MockLinkProps) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

describe("FinalCTA", () => {
  describe("Headline", () => {
    test("should render headline", () => {
      render(<FinalCTA />);

      expect(screen.getByText("Ready to Find Your Dog?")).toBeInTheDocument();
    });

    test("should have correct heading styles", () => {
      render(<FinalCTA />);

      const heading = screen.getByText("Ready to Find Your Dog?");
      expect(heading).toHaveClass(
        "text-4xl",
        "lg:text-5xl",
        "font-bold",
        "text-white",
      );
    });

    test("should be centered", () => {
      render(<FinalCTA />);

      const heading = screen.getByText("Ready to Find Your Dog?");
      expect(heading).toHaveClass("text-center");
    });
  });

  describe("CTA Cards", () => {
    test("should render 3 CTA cards", () => {
      render(<FinalCTA />);

      expect(screen.getByText("Browse All Dogs")).toBeInTheDocument();
      expect(screen.getByText("Explore Breeds")).toBeInTheDocument();
      expect(screen.getByText("Start Swiping")).toBeInTheDocument();
    });

    test("should render Browse All Dogs card with correct content", () => {
      render(<FinalCTA />);

      expect(screen.getByText("Browse All Dogs")).toBeInTheDocument();
      expect(screen.getByText("3,186 available")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Advanced filters by breed, age, size, gender, and location",
        ),
      ).toBeInTheDocument();
    });

    test("should render Explore Breeds card with correct content", () => {
      render(<FinalCTA />);

      expect(screen.getByText("Explore Breeds")).toBeInTheDocument();
      expect(screen.getByText("50+ analyzed")).toBeInTheDocument();
      expect(
        screen.getByText("Personality insights and traits for every breed"),
      ).toBeInTheDocument();
    });

    test("should render Start Swiping card with correct content", () => {
      render(<FinalCTA />);

      expect(screen.getByText("Start Swiping")).toBeInTheDocument();
      expect(screen.getByText("Quick matches")).toBeInTheDocument();
      expect(
        screen.getByText("Discover dogs filtered by your preferences"),
      ).toBeInTheDocument();
    });

    test("should have correct links", () => {
      render(<FinalCTA />);

      const browseCard = screen.getByText("Browse All Dogs").closest("a");
      expect(browseCard).toHaveAttribute("href", "/dogs");

      const breedsCard = screen.getByText("Explore Breeds").closest("a");
      expect(breedsCard).toHaveAttribute("href", "/breeds");

      const swipeCard = screen.getByText("Start Swiping").closest("a");
      expect(swipeCard).toHaveAttribute("href", "/swipe");
    });

    test("should wrap entire cards in links", () => {
      render(<FinalCTA />);

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(3);

      links.forEach((link) => {
        expect(link).toHaveAttribute("href");
        expect(link).toHaveClass("group");
      });
    });

    test("should have hover effects", () => {
      const { container } = render(<FinalCTA />);

      const cards = container.querySelectorAll(".group > div");
      cards.forEach((card) => {
        expect(card).toHaveClass(
          "hover:shadow-2xl",
          "hover:-translate-y-2",
          "transition-all",
          "duration-300",
        );
      });
    });

    test("should have 280px width on desktop", () => {
      render(<FinalCTA />);

      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        expect(link).toHaveClass("xl:w-[280px]");
      });
    });
  });

  describe("Card Styling", () => {
    test("should have white background in light mode", () => {
      const { container } = render(<FinalCTA />);

      const cards = container.querySelectorAll(".bg-white");
      expect(cards.length).toBeGreaterThan(0);
    });

    test("should have correct text colors", () => {
      render(<FinalCTA />);

      const title = screen.getByText("Browse All Dogs");
      expect(title).toHaveClass("text-gray-900", "dark:text-white");

      const subtitle = screen.getByText("3,186 available");
      expect(subtitle).toHaveClass("text-orange-600", "dark:text-orange-400");

      const description = screen.getByText(/Advanced filters by breed/);
      expect(description).toHaveClass("text-gray-600", "dark:text-gray-400");
    });

    test("should have rounded corners", () => {
      const { container } = render(<FinalCTA />);

      const cards = container.querySelectorAll(".rounded-xl");
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe("Responsive Design", () => {
    test("should have gradient background", () => {
      const { container } = render(<FinalCTA />);

      const section = container.querySelector("section");
      expect(section).toHaveClass(
        "bg-gradient-to-br",
        "from-slate-800",
        "via-slate-700",
        "to-slate-900",
      );
    });

    test("should have section padding", () => {
      const { container } = render(<FinalCTA />);

      const section = container.querySelector("section");
      expect(section).toHaveClass("py-32");
    });

    test("should have max-width container", () => {
      const { container } = render(<FinalCTA />);

      const innerDiv = container.querySelector(".max-w-7xl");
      expect(innerDiv).toHaveClass("mx-auto", "px-4", "sm:px-6", "lg:px-8");
    });

    test("should have responsive grid", () => {
      const { container } = render(<FinalCTA />);

      const grid = container.querySelector(".grid");
      expect(grid).toHaveClass("grid-cols-1", "xl:grid-cols-3", "gap-6");
    });

    test("should center cards as a group", () => {
      const { container } = render(<FinalCTA />);

      const grid = container.querySelector(".grid");
      expect(grid).toHaveClass("justify-items-center", "max-w-4xl", "mx-auto");
    });

    test("should stack vertically on mobile", () => {
      const { container } = render(<FinalCTA />);

      const grid = container.querySelector(".grid");
      expect(grid).toHaveClass("grid-cols-1");
    });

    test("should show 3 columns on desktop", () => {
      const { container } = render(<FinalCTA />);

      const grid = container.querySelector(".grid");
      expect(grid).toHaveClass("xl:grid-cols-3");
    });
  });

  describe("Dark Mode", () => {
    test("should have dark mode section background", () => {
      const { container } = render(<FinalCTA />);

      const section = container.querySelector("section");
      expect(section).toHaveClass(
        "dark:from-slate-900",
        "dark:via-slate-800",
        "dark:to-black",
      );
    });

    test("should have dark mode card styling", () => {
      const { container } = render(<FinalCTA />);

      const cards = container.querySelectorAll(".dark\\:bg-gray-800");
      expect(cards.length).toBeGreaterThan(0);
    });

    test("should have dark mode text colors", () => {
      render(<FinalCTA />);

      const heading = screen.getByText("Ready to Find Your Dog?");
      expect(heading).toHaveClass("text-white");

      const title = screen.getByText("Browse All Dogs");
      expect(title).toHaveClass("dark:text-white");

      const subtitle = screen.getByText("3,186 available");
      expect(subtitle).toHaveClass("dark:text-orange-400");
    });
  });

  describe("Accessibility", () => {
    test("should use semantic section element", () => {
      const { container } = render(<FinalCTA />);

      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    test("should have aria-labelledby on section", () => {
      const { container } = render(<FinalCTA />);

      const section = container.querySelector("section");
      expect(section).toHaveAttribute("aria-labelledby", "final-cta-heading");
    });

    test("should have id on h2 for aria-labelledby", () => {
      render(<FinalCTA />);

      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toHaveAttribute("id", "final-cta-heading");
    });

    test("should have proper heading hierarchy", () => {
      render(<FinalCTA />);

      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toHaveTextContent("Ready to Find Your Dog?");
    });

    test("should have clickable card links", () => {
      render(<FinalCTA />);

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(3);

      links.forEach((link) => {
        expect(link).toHaveAttribute("href");
      });
    });

    test("should have descriptive link text", () => {
      render(<FinalCTA />);

      expect(screen.getByText("Browse All Dogs")).toBeInTheDocument();
      expect(screen.getByText("Explore Breeds")).toBeInTheDocument();
      expect(screen.getByText("Start Swiping")).toBeInTheDocument();
    });
  });

  describe("Content", () => {
    test("should display all card titles", () => {
      render(<FinalCTA />);

      expect(
        screen.getByRole("heading", { name: "Browse All Dogs" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Explore Breeds" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Start Swiping" }),
      ).toBeInTheDocument();
    });

    test("should display all card subtitles", () => {
      render(<FinalCTA />);

      expect(screen.getByText("3,186 available")).toBeInTheDocument();
      expect(screen.getByText("50+ analyzed")).toBeInTheDocument();
      expect(screen.getByText("Quick matches")).toBeInTheDocument();
    });

    test("should display all card descriptions", () => {
      render(<FinalCTA />);

      expect(screen.getByText(/Advanced filters by breed/)).toBeInTheDocument();
      expect(
        screen.getByText(/Personality insights and traits/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Discover dogs filtered/)).toBeInTheDocument();
    });
  });
});
