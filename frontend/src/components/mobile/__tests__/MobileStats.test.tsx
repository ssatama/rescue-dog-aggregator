import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import MobileStats from "../MobileStats";

describe("MobileStats", () => {
  const mockStats = [
    { label: "Dogs", value: "2,860" },
    { label: "Rescues", value: "13" },
    { label: "Breeds", value: "50+" },
  ];

  describe("Rendering", () => {
    it("renders all three statistics", () => {
      render(<MobileStats stats={mockStats} />);

      expect(screen.getByText("2,860")).toBeInTheDocument();
      expect(screen.getByText("13")).toBeInTheDocument();
      expect(screen.getByText("50+")).toBeInTheDocument();
    });

    it("renders correct labels for each statistic", () => {
      render(<MobileStats stats={mockStats} />);

      expect(screen.getByText("Dogs")).toBeInTheDocument();
      expect(screen.getByText("Rescues")).toBeInTheDocument();
      expect(screen.getByText("Breeds")).toBeInTheDocument();
    });

    it("has flex layout with 3 columns", () => {
      const { container } = render(<MobileStats stats={mockStats} />);

      const flexContainer = container.querySelector(
        ".flex.items-center.justify-around",
      );
      expect(flexContainer).toBeInTheDocument();

      const statItems = container.querySelectorAll("[data-testid^='stat-']");
      expect(statItems).toHaveLength(3);
    });

    it("is hidden on desktop viewports (md and above)", () => {
      const { container } = render(<MobileStats stats={mockStats} />);

      const statsSection = container.firstChild as HTMLElement;
      expect(statsSection).toHaveClass("md:hidden");
    });

    it("has white background with border", () => {
      const { container } = render(<MobileStats stats={mockStats} />);

      const statsCard = container.querySelector(".bg-white");
      expect(statsCard).toBeInTheDocument();
      expect(statsCard).toHaveClass("border");
    });

    it("has rounded corners", () => {
      const { container } = render(<MobileStats stats={mockStats} />);

      const statsCard = container.querySelector(".rounded-2xl");
      expect(statsCard).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("shows skeleton loaders when loading is true", () => {
      const { container } = render(<MobileStats loading={true} />);

      const skeletonContainer = container.querySelector(".animate-pulse");
      expect(skeletonContainer).toBeInTheDocument();

      // Check that we have 3 skeleton items
      const skeletonItems = skeletonContainer?.querySelectorAll(".text-center");
      expect(skeletonItems).toHaveLength(3);
    });
  });

  describe("Default Props", () => {
    it("uses default stats when none provided", () => {
      render(<MobileStats />);

      expect(screen.getByText("3,112")).toBeInTheDocument();
      expect(screen.getByText("13")).toBeInTheDocument();
      expect(screen.getByText("50+")).toBeInTheDocument();
    });
  });

  describe("Data Testids", () => {
    it("assigns correct test ids based on labels", () => {
      render(<MobileStats stats={mockStats} />);

      expect(screen.getByTestId("stat-dogs")).toBeInTheDocument();
      expect(screen.getByTestId("stat-rescues")).toBeInTheDocument();
      expect(screen.getByTestId("stat-breeds")).toBeInTheDocument();
    });
  });

  describe("Custom Stats", () => {
    it("renders custom stat values", () => {
      const customStats = [
        { label: "Active", value: "150" },
        { label: "Pending", value: "25" },
        { label: "Adopted", value: "500+" },
      ];

      render(<MobileStats stats={customStats} />);

      expect(screen.getByText("150")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
      expect(screen.getByText("500+")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText("Adopted")).toBeInTheDocument();
    });
  });
});
