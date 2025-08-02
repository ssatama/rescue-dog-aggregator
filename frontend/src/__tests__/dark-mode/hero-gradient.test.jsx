/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
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

describe("HeroSection Dark Mode Gradient", () => {
  beforeEach(() => {
    // Reset document
    document.documentElement.className = "";
  });

  test("hero section has hero-gradient class in dark mode", () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    render(<HeroSection />);

    const heroSection = screen.getByTestId("hero-section");
    expect(heroSection).toBeInTheDocument();
    expect(heroSection).toHaveClass("hero-gradient");

    // Verify dark class is applied to document
    expect(document.documentElement).toHaveClass("dark");

    // Hero section should have the hero-gradient class which will be styled by CSS
    expect(heroSection).toHaveClass("hero-gradient");
  });

  test("hero section has hero-gradient class in light mode", () => {
    // Light mode (default)
    render(<HeroSection />);

    const heroSection = screen.getByTestId("hero-section");
    expect(heroSection).toBeInTheDocument();
    expect(heroSection).toHaveClass("hero-gradient");

    // Verify dark class is NOT applied to document
    expect(document.documentElement).not.toHaveClass("dark");
  });

  test("hero section maintains accessibility in both modes", () => {
    // Test light mode
    const { unmount } = render(<HeroSection />);
    let heroTitle = screen.getByTestId("hero-title");
    expect(heroTitle).toHaveClass("text-foreground");

    // Clean up
    unmount();

    // Test dark mode
    document.documentElement.classList.add("dark");
    render(<HeroSection />);
    heroTitle = screen.getByTestId("hero-title");
    expect(heroTitle).toHaveClass("text-foreground");
  });
});
