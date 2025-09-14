import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdoptedCelebration from "../AdoptedCelebration";

describe("AdoptedCelebration", () => {
  describe("rendering", () => {
    it("renders generic message when no dog name provided", () => {
      render(<AdoptedCelebration />);
      // Component renders "This wonderful dog has been adopted!" with emoji
      expect(
        screen.getByText(/This wonderful dog has been adopted!/),
      ).toBeInTheDocument();
    });

    it("shows correct celebration heading", () => {
      render(<AdoptedCelebration />);
      expect(screen.getByText("Adoption Success!")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("applies purple gradient background styling", () => {
      const { container } = render(<AdoptedCelebration dogName="Daisy" />);
      const celebrationDiv = container.firstChild;
      expect(celebrationDiv).toHaveClass("bg-gradient-to-r");
      expect(celebrationDiv).toHaveClass("from-purple-600");
      expect(celebrationDiv).toHaveClass("to-purple-800");
    });

    it("applies correct text styling", () => {
      const { container } = render(<AdoptedCelebration dogName="Rocky" />);
      const textDiv = container.querySelector(".text-center");
      expect(textDiv).toBeInTheDocument();
    });

    it("applies correct padding and rounding", () => {
      const { container } = render(<AdoptedCelebration dogName="Luna" />);
      const celebrationDiv = container.firstChild;
      expect(celebrationDiv).toHaveClass("p-8");
      expect(celebrationDiv).toHaveClass("rounded-2xl");
    });

    it("applies shadow for depth", () => {
      const { container } = render(<AdoptedCelebration dogName="Duke" />);
      const celebrationDiv = container.firstChild;
      expect(celebrationDiv).toHaveClass("shadow-2xl");
    });

    it("applies correct margin", () => {
      const { container } = render(<AdoptedCelebration dogName="Molly" />);
      const celebrationDiv = container.firstChild;
      expect(celebrationDiv).toHaveClass("mb-8");
    });
  });

  describe("content structure", () => {
    it("contains heading element with proper styling", () => {
      render(<AdoptedCelebration dogName="Oscar" />);
      const heading = screen.getByText("Adoption Success!");
      expect(heading.tagName).toBe("H1");
      expect(heading).toHaveClass(
        "text-4xl",
        "md:text-5xl",
        "font-bold",
        "text-white",
      );
    });

    it("contains secondary message about page preservation", () => {
      render(<AdoptedCelebration />);
      const secondaryMessage = screen.getByText(
        /We keep this page active to celebrate/,
      );
      expect(secondaryMessage).toBeInTheDocument();
      // Fix the class check - the component uses a compound class string
      expect(secondaryMessage.parentElement).toHaveClass(
        "text-sm",
        "text-purple-200",
        "bg-purple-800/30",
      );
    });
  });

  describe("edge cases", () => {
    it("handles empty dog name gracefully", () => {
      render(<AdoptedCelebration dogName="" />);
      // Empty string is falsy, so it shows the default message
      expect(
        screen.getByText(/This wonderful dog has been adopted!/),
      ).toBeInTheDocument();
    });

    it("handles whitespace-only dog name", () => {
      render(<AdoptedCelebration dogName="   " />);
      // Whitespace is truthy, so it shows "   has found their forever home!"
      expect(
        screen.getByText(/has found their forever home!/),
      ).toBeInTheDocument();
    });

    it("handles special characters in dog name", () => {
      render(<AdoptedCelebration dogName="Max & Bella" />);
      expect(
        screen.getByText(/Max & Bella has found their forever home!/),
      ).toBeInTheDocument();
    });
  });

  describe("celebration emojis", () => {
    it("displays celebration emojis", () => {
      render(<AdoptedCelebration dogName="Test" />);
      expect(screen.getByText("🎉 🐕 ❤️ 🏠 ✨")).toBeInTheDocument();
    });
  });
});
