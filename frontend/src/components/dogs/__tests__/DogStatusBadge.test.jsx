import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import DogStatusBadge from "../DogStatusBadge";

describe("DogStatusBadge", () => {
  describe("available status", () => {
    it("renders correct label for available status", () => {
      render(<DogStatusBadge status="available" />);
      expect(screen.getByText("Available")).toBeInTheDocument();
    });

    it("applies correct CSS classes for available status", () => {
      render(<DogStatusBadge status="available" />);
      const badge = screen.getByText("Available").closest("span");
      expect(badge).toHaveClass("bg-green-100");
      expect(badge).toHaveClass("text-green-800");
    });

    it("shows check icon for available status", () => {
      render(<DogStatusBadge status="available" />);
      expect(screen.getByText("✅")).toBeInTheDocument();
    });
  });

  describe("unknown status", () => {
    it("renders correct label for unknown status", () => {
      render(<DogStatusBadge status="unknown" />);
      expect(screen.getByText("Checking availability...")).toBeInTheDocument();
    });

    it("applies correct CSS classes for unknown status", () => {
      render(<DogStatusBadge status="unknown" />);
      const badge = screen
        .getByText("Checking availability...")
        .closest("span");
      expect(badge).toHaveClass("bg-yellow-100");
      expect(badge).toHaveClass("text-yellow-800");
    });

    it("shows search icon for unknown status", () => {
      render(<DogStatusBadge status="unknown" />);
      expect(screen.getByText("🔍")).toBeInTheDocument();
    });
  });

  describe("adopted status", () => {
    it("renders correct label for adopted status", () => {
      render(<DogStatusBadge status="adopted" />);
      expect(screen.getByText("Found their forever home!")).toBeInTheDocument();
    });

    it("applies correct CSS classes for adopted status", () => {
      render(<DogStatusBadge status="adopted" />);
      const badge = screen
        .getByText("Found their forever home!")
        .closest("span");
      expect(badge).toHaveClass("bg-purple-100");
      expect(badge).toHaveClass("text-purple-800");
    });

    it("shows celebration icon for adopted status", () => {
      render(<DogStatusBadge status="adopted" />);
      expect(screen.getByText("🎉")).toBeInTheDocument();
    });
  });

  describe("reserved status", () => {
    it("renders correct label for reserved status", () => {
      render(<DogStatusBadge status="reserved" />);
      expect(
        screen.getByText("Reserved - Adoption pending"),
      ).toBeInTheDocument();
    });

    it("applies correct CSS classes for reserved status", () => {
      render(<DogStatusBadge status="reserved" />);
      const badge = screen
        .getByText("Reserved - Adoption pending")
        .closest("span");
      expect(badge).toHaveClass("bg-blue-100");
      expect(badge).toHaveClass("text-blue-800");
    });

    it("shows hourglass icon for reserved status", () => {
      render(<DogStatusBadge status="reserved" />);
      expect(screen.getByText("⏳")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles undefined status gracefully by defaulting to available", () => {
      render(<DogStatusBadge status={undefined} />);
      expect(screen.getByText("Available")).toBeInTheDocument();
    });

    it("handles null status gracefully by defaulting to available", () => {
      render(<DogStatusBadge status={null} />);
      expect(screen.getByText("Available")).toBeInTheDocument();
    });

    it("handles invalid status value gracefully by defaulting to available", () => {
      render(<DogStatusBadge status="invalid" />);
      expect(screen.getByText("Available")).toBeInTheDocument();
    });
  });

  describe("common styling", () => {
    it("applies common badge styling to all statuses", () => {
      const { rerender } = render(<DogStatusBadge status="available" />);
      let badge = screen.getByText("Available").closest("span");
      expect(badge).toHaveClass("inline-flex", "items-center", "rounded-full");

      rerender(<DogStatusBadge status="adopted" />);
      badge = screen.getByText("Found their forever home!").closest("span");
      expect(badge).toHaveClass("inline-flex", "items-center", "rounded-full");
    });
  });
});
