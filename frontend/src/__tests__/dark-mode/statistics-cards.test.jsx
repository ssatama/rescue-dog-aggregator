/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "../../test-utils";
import "@testing-library/jest-dom";
import HeroSection from "../../components/home/HeroSection";

// Mock the statistics service
jest.mock("../../services/animalsService", () => ({
  getStatistics: jest.fn(() =>
    Promise.resolve({
      total_dogs: 393,
      total_organizations: 3,
      countries: ["DE", "TR", "UK"],
      organizations: [
        { id: 1, name: "REAN", dog_count: 28 },
        { id: 2, name: "Pets in Turkey", dog_count: 33 },
        { id: 3, name: "Tierschutzverein Europa e.V.", dog_count: 332 },
      ],
    }),
  ),
}));

// Mock logger
jest.mock("../../utils/logger", () => ({
  reportError: jest.fn(),
}));

describe("Statistics Cards Dark Mode", () => {
  beforeEach(() => {
    // Reset document classes
    document.documentElement.className = "";
  });

  test("statistics cards have dark backgrounds in dark mode", async () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    render(<HeroSection />);

    // Wait for statistics to load
    await waitFor(() => {
      expect(screen.getByTestId("statistics-content")).toBeInTheDocument();
    });

    // Get the statistics grid container
    const statisticsGrid = screen.getByTestId("statistics-grid");
    expect(statisticsGrid).toBeInTheDocument();

    // Get all the statistic cards within the grid
    const cards = statisticsGrid.querySelectorAll("div.bg-card\\/80");
    expect(cards).toHaveLength(3);

    // Each card should have dark mode appropriate styling
    cards.forEach((card) => {
      expect(card).toHaveClass("bg-card/80");
      expect(card).toHaveClass("dark:bg-gray-800/90");
      expect(card).toHaveClass("backdrop-blur-sm");
      expect(card).toHaveClass("rounded-lg");
      expect(card).toHaveClass("dark:shadow-purple-500/10");
    });

    // Also check the organizations breakdown card
    const organizationsCard = screen
      .getByText("Dogs available from these organizations:")
      .closest("div.bg-card\\/80");
    expect(organizationsCard).toHaveClass("bg-card/80");
    expect(organizationsCard).toHaveClass("dark:bg-gray-800/90");
    expect(organizationsCard).toHaveClass("dark:shadow-purple-500/10");
  });

  test("statistics cards have light backgrounds in light mode", async () => {
    // Light mode (default)
    render(<HeroSection />);

    // Wait for statistics to load
    await waitFor(() => {
      expect(screen.getByTestId("statistics-content")).toBeInTheDocument();
    });

    // Get the statistics grid container
    const statisticsGrid = screen.getByTestId("statistics-grid");
    expect(statisticsGrid).toBeInTheDocument();

    // Get all the statistic cards within the grid
    const cards = statisticsGrid.querySelectorAll("div.bg-card\\/80");
    expect(cards).toHaveLength(3);

    // Each card should have the same classes
    cards.forEach((card) => {
      expect(card).toHaveClass("bg-card/80");
      expect(card).toHaveClass("backdrop-blur-sm");
      expect(card).toHaveClass("rounded-lg");
    });

    // Verify dark class is NOT applied to document
    expect(document.documentElement).not.toHaveClass("dark");
  });

  test("statistics cards use CSS variables for theming", async () => {
    render(<HeroSection />);

    // Wait for statistics to load
    await waitFor(() => {
      expect(screen.getByTestId("statistics-content")).toBeInTheDocument();
    });

    // Get a statistics card
    const statisticsGrid = screen.getByTestId("statistics-grid");
    const firstCard = statisticsGrid.querySelector("div.bg-card\\/80");

    expect(firstCard).toHaveClass("bg-card/80");

    // The bg-card/80 class should work with CSS variables defined in globals.css
    // In light mode: --card should be defined
    // In dark mode: --card should be redefined for dark backgrounds
  });
});
