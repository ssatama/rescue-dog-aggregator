import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CompareMode from "../CompareMode";

// Mock the comparison analyzer
jest.mock("../../../utils/comparisonAnalyzer", () => ({
  analyzeComparison: jest.fn(() => ({
    age: {
      values: ["2 years", "3 years", "2 years"],
      allSame: false,
      highlight: [true, false, true],
    },
    sex: {
      values: ["Male", "Female", "Male"],
      allSame: false,
      highlight: [false, true, false],
    },
    size: {
      values: ["Medium", "Medium", "Medium"],
      allSame: true,
      highlight: [false, false, false],
    },
    breed: {
      values: ["Mixed Breed", "Labrador", "Mixed Breed"],
      allSame: false,
      highlight: [false, true, false],
    },
    location: {
      values: ["Italy", "Italy", "Italy"],
      allSame: true,
      highlight: [false, false, false],
    },
    organization: {
      values: ["Test Org", "Test Org", "Test Org"],
      allSame: true,
      highlight: [false, false, false],
    },
    good_with_dogs: {
      values: [true, true, false],
      allSame: false,
      highlight: [false, false, true],
    },
    good_with_cats: {
      values: [true, false, true],
      allSame: false,
      highlight: [false, true, false],
    },
    good_with_children: {
      values: [true, true, true],
      allSame: true,
      highlight: [false, false, false],
    },
  })),
}));

describe("CompareMode", () => {
  const mockDogs = [
    {
      id: 1,
      name: "Buddy",
      breed: "Mixed Breed",
      age_text: "2 years",
      sex: "Male",
      standardized_size: "Medium",
      location: "Italy",
      organization_name: "Test Org",
      primary_image_url: "https://example.com/buddy.jpg",
      properties: {
        good_with_dogs: true,
        good_with_cats: true,
        good_with_children: true,
        description: "A friendly dog",
      },
    },
    {
      id: 2,
      name: "Luna",
      breed: "Labrador",
      age_text: "3 years",
      sex: "Female",
      standardized_size: "Medium",
      location: "Italy",
      organization_name: "Test Org",
      primary_image_url: "https://example.com/luna.jpg",
      properties: {
        good_with_dogs: true,
        good_with_cats: false,
        good_with_children: true,
        description: "A playful dog",
      },
    },
    {
      id: 3,
      name: "Max",
      breed: "Mixed Breed",
      age_text: "2 years",
      sex: "Male",
      standardized_size: "Medium",
      location: "Italy",
      organization_name: "Test Org",
      primary_image_url: "https://example.com/max.jpg",
      properties: {
        good_with_dogs: false,
        good_with_cats: true,
        good_with_children: true,
        description: "A calm dog",
      },
    },
  ];

  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  describe("Selection View", () => {
    it("should render selection view with all dogs", () => {
      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      expect(screen.getByText("Select Dogs to Compare")).toBeInTheDocument();
      expect(
        screen.getByText("Choose 2-3 dogs to compare side by side"),
      ).toBeInTheDocument();

      // Check all dogs are displayed
      expect(screen.getByText("Buddy")).toBeInTheDocument();
      expect(screen.getByText("Luna")).toBeInTheDocument();
      expect(screen.getByText("Max")).toBeInTheDocument();
    });

    it("should allow selecting dogs", () => {
      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      const buddyCheckbox = screen.getByRole("checkbox", {
        name: /Select Buddy/i,
      });
      fireEvent.click(buddyCheckbox);

      expect(screen.getByText("1 selected")).toBeInTheDocument();
    });

    it("should limit selection to 3 dogs", () => {
      const fourDogs = [...mockDogs, { ...mockDogs[0], id: 4, name: "Extra" }];
      render(<CompareMode dogs={fourDogs} onClose={mockOnClose} />);

      // Select 3 dogs using checkboxes
      fireEvent.click(screen.getByRole("checkbox", { name: /Select Buddy/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Select Luna/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Select Max/i }));

      expect(screen.getByText("3 selected")).toBeInTheDocument();

      // Fourth dog checkbox should be disabled
      const extraCheckbox = screen.getByRole("checkbox", {
        name: /Select Extra/i,
      });
      expect(extraCheckbox).toBeDisabled();
    });

    it("should enable compare button when 2+ dogs selected", () => {
      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      const compareButton = screen.getByRole("button", { name: /Compare/i });
      expect(compareButton).toBeDisabled();

      // Select 2 dogs using checkboxes
      fireEvent.click(screen.getByRole("checkbox", { name: /Select Buddy/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Select Luna/i }));

      expect(compareButton).not.toBeDisabled();
      expect(compareButton).toHaveTextContent("Compare (2)");
    });
  });

  describe("Comparison View", () => {
    it("should switch to comparison view when compare is clicked", () => {
      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      // Select dogs using checkboxes and compare
      fireEvent.click(screen.getByRole("checkbox", { name: /Select Buddy/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Select Luna/i }));
      fireEvent.click(screen.getByRole("button", { name: /Compare \(2\)/i }));

      // Should show comparison view
      expect(
        screen.getByText(/Compare Your Favorites|Compare Dogs/),
      ).toBeInTheDocument();
    });

    it("should display highlighted differences in comparison view", () => {
      // Mock window.innerWidth for desktop view
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });

      // Mock matchMedia for useMediaQuery hook - desktop view
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: true, // Desktop is when (min-width: 768px) returns true
          media: query,
          onchange: null,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      // Select dogs using checkboxes and compare
      fireEvent.click(screen.getByRole("checkbox", { name: /Select Buddy/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Select Luna/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Select Max/i }));
      fireEvent.click(screen.getByRole("button", { name: /Compare \(3\)/i }));

      // Check that comparison table exists
      expect(screen.getByText("Detailed Comparison")).toBeInTheDocument();
    });
  });

  describe("Modal Behavior", () => {
    it("should close on backdrop click", () => {
      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      const backdrop = document.querySelector(".fixed.inset-0");
      fireEvent.click(backdrop!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should close on X button click", () => {
      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText("Close");
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should close on Escape key", () => {
      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Mobile View", () => {
    beforeEach(() => {
      // Mock window.innerWidth for mobile view
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      // Mock matchMedia for useMediaQuery hook
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: false, // Mobile is when (min-width: 768px) returns false
          media: query,
          onchange: null,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
    });

    it("should render mobile comparison table layout", () => {
      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      // Select dogs using checkboxes and compare
      fireEvent.click(screen.getByRole("checkbox", { name: /Select Buddy/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Select Luna/i }));
      fireEvent.click(screen.getByRole("button", { name: /Compare \(2\)/i }));

      // Should show mobile-specific elements
      expect(
        screen.getByText("Swipe to compare your favorites"),
      ).toBeInTheDocument();
    });

    it("should show 2-column grid in selection view on mobile", () => {
      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      const grid = screen.getByText("Buddy").closest('div[class*="grid"]');
      expect(grid).toHaveClass("grid-cols-2");
    });
  });
});
