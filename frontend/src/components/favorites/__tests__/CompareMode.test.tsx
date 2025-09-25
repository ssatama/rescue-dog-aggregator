import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CompareMode from "../CompareMode";

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
        screen.getByText("Choose 2-4 dogs to compare side by side"),
      ).toBeInTheDocument();

      // Check all dogs are displayed
      expect(screen.getByText("Buddy")).toBeInTheDocument();
      expect(screen.getByText("Luna")).toBeInTheDocument();
      expect(screen.getByText("Max")).toBeInTheDocument();
    });

    it("should allow selecting dogs", () => {
      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      // Click on dog card instead of checkbox
      const buddyCard = screen.getByTestId("dog-card-1");
      fireEvent.click(buddyCard);

      expect(screen.getByText("1 of 3 selected")).toBeInTheDocument();
    });

    it("should limit selection to 3 dogs", () => {
      const fourDogs = [...mockDogs, { ...mockDogs[0], id: 4, name: "Extra" }];
      render(<CompareMode dogs={fourDogs} onClose={mockOnClose} />);

      // Select 3 dogs using cards
      fireEvent.click(screen.getByTestId("dog-card-1"));
      fireEvent.click(screen.getByTestId("dog-card-2"));
      fireEvent.click(screen.getByTestId("dog-card-3"));

      expect(screen.getByText("3 of 3 selected")).toBeInTheDocument();

      // Fourth dog card should be disabled
      const extraCard = screen.getByTestId("dog-card-4");
      expect(extraCard).toHaveAttribute("aria-disabled", "true");
    });

    it("should enable compare button when 2+ dogs selected", () => {
      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      const compareButton = screen.getByRole("button", {
        name: /Compare Selected/i,
      });
      expect(compareButton).toBeDisabled();

      // Select 2 dogs using cards
      fireEvent.click(screen.getByTestId("dog-card-1"));
      fireEvent.click(screen.getByTestId("dog-card-2"));

      expect(compareButton).not.toBeDisabled();
    });
  });

  describe("Comparison View", () => {
    it("should switch to comparison view when compare is clicked", () => {
      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      // Select dogs and compare
      fireEvent.click(screen.getByTestId("dog-card-1"));
      fireEvent.click(screen.getByTestId("dog-card-2"));
      fireEvent.click(
        screen.getByRole("button", { name: /Compare Selected/i }),
      );

      // Should show comparison view
      expect(screen.getByText("Compare Your Favorites")).toBeInTheDocument();
    });

    it("should display comparison view with selected dogs", () => {
      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      // Select dogs and compare
      fireEvent.click(screen.getByTestId("dog-card-1"));
      fireEvent.click(screen.getByTestId("dog-card-2"));
      fireEvent.click(screen.getByTestId("dog-card-3"));
      fireEvent.click(
        screen.getByRole("button", { name: /Compare Selected/i }),
      );

      // Check that selected dogs are in comparison (may have multiple instances due to responsive design)
      expect(screen.getAllByText("Buddy").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Luna").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Max").length).toBeGreaterThan(0);
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

      // Trigger resize event
      global.dispatchEvent(new Event("resize"));
    });

    it("should show proper mobile comparison view", () => {
      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      // Select dogs and compare
      fireEvent.click(screen.getByTestId("dog-card-1"));
      fireEvent.click(screen.getByTestId("dog-card-2"));
      fireEvent.click(
        screen.getByRole("button", { name: /Compare Selected/i }),
      );

      // Should show comparison view
      expect(screen.getByText("Compare Your Favorites")).toBeInTheDocument();
    });

    it("should show 2-column grid in selection view on mobile", () => {
      render(<CompareMode dogs={mockDogs} onClose={mockOnClose} />);

      const grid = screen.getByText("Buddy").closest('div[class*="grid"]');
      expect(grid).toHaveClass("grid-cols-2");
    });
  });
});
