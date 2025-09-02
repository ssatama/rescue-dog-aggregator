import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import SwipeFilters from "../SwipeFilters";

describe("SwipeFilters", () => {
  const mockOnFiltersChange = jest.fn();

  beforeEach(() => {
    mockOnFiltersChange.mockClear();
    localStorage.clear();
  });

  describe("Country Selection", () => {
    it("should render country selector", () => {
      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      expect(screen.getByLabelText("Country")).toBeInTheDocument();
    });

    it("should require country selection on first use", () => {
      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      const countrySelect = screen.getByLabelText("Country");
      expect(countrySelect).toHaveAttribute("required");
    });

    it("should show available countries with dog counts", () => {
      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      const countrySelect = screen.getByLabelText("Country");
      fireEvent.click(countrySelect);

      expect(screen.getByText(/Germany/)).toBeInTheDocument();
      expect(screen.getByText(/United Kingdom/)).toBeInTheDocument();
      expect(screen.getByText(/United States/)).toBeInTheDocument();
    });

    it("should update filters when country is selected", async () => {
      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      const countrySelect = screen.getByLabelText("Country");
      fireEvent.change(countrySelect, { target: { value: "DE" } });

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          country: "DE",
          sizes: [],
          ages: [],
        });
      });
    });
  });

  describe("Size Preferences", () => {
    it("should render size multi-selection options", () => {
      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      expect(screen.getByText(/Small/)).toBeInTheDocument();
      expect(screen.getByText(/Medium/)).toBeInTheDocument();
      expect(screen.getByText(/Large/)).toBeInTheDocument();
      expect(screen.getByText(/Giant/)).toBeInTheDocument();
    });

    it("should allow size multi-selection", async () => {
      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      const smallButton = screen.getByRole("button", { name: /Small/i });
      const mediumButton = screen.getByRole("button", { name: /Medium/i });

      fireEvent.click(smallButton);
      fireEvent.click(mediumButton);

      await waitFor(() => {
        expect(smallButton).toHaveClass("selected");
        expect(mediumButton).toHaveClass("selected");
      });
    });

    it("should update filters when sizes are selected", async () => {
      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      // First set country (required)
      const countrySelect = screen.getByLabelText("Country");
      fireEvent.change(countrySelect, { target: { value: "DE" } });

      // Then select sizes
      const smallButton = screen.getByRole("button", { name: /Small/i });
      const mediumButton = screen.getByRole("button", { name: /Medium/i });

      fireEvent.click(smallButton);
      fireEvent.click(mediumButton);

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenLastCalledWith({
          country: "DE",
          sizes: ["small", "medium"],
          ages: [],
        });
      });
    });

    it("should toggle size selection on click", async () => {
      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      const smallButton = screen.getByRole("button", { name: /Small/i });

      // Select
      fireEvent.click(smallButton);
      expect(smallButton).toHaveClass("selected");

      // Deselect
      fireEvent.click(smallButton);
      expect(smallButton).not.toHaveClass("selected");
    });
  });

  describe("Persistence", () => {
    it("should persist filters to localStorage", async () => {
      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      const countrySelect = screen.getByLabelText("Country");
      fireEvent.change(countrySelect, { target: { value: "DE" } });

      const smallButton = screen.getByRole("button", { name: /Small/i });
      fireEvent.click(smallButton);

      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem("swipeFilters") || "{}");
        expect(stored).toEqual({
          country: "DE",
          sizes: ["small"],
          ages: [],
        });
      });
    });

    it("should load filters from localStorage on mount", () => {
      const savedFilters = {
        country: "GB",
        sizes: ["medium", "large"],
        ages: [],
      };
      localStorage.setItem("swipeFilters", JSON.stringify(savedFilters));

      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      const countrySelect = screen.getByLabelText(
        "Country",
      ) as HTMLSelectElement;
      expect(countrySelect.value).toBe("GB");

      const mediumButton = screen.getByRole("button", { name: /Medium/i });
      const largeButton = screen.getByRole("button", { name: /Large/i });
      expect(mediumButton).toHaveClass("selected");
      expect(largeButton).toHaveClass("selected");
    });

    it("should call onFiltersChange with saved filters on mount", () => {
      const savedFilters = { country: "DE", sizes: ["small"], ages: [] };
      localStorage.setItem("swipeFilters", JSON.stringify(savedFilters));

      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      expect(mockOnFiltersChange).toHaveBeenCalledWith(savedFilters);
    });
  });

  describe("Visual Feedback", () => {
    it("should show selected country with flag emoji", () => {
      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      const countrySelect = screen.getByLabelText("Country");
      fireEvent.change(countrySelect, { target: { value: "DE" } });

      expect(screen.getByText(/🇩🇪/)).toBeInTheDocument();
    });

    it("should highlight selected size filters", async () => {
      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      const smallButton = screen.getByRole("button", { name: /Small/i });
      fireEvent.click(smallButton);

      await waitFor(() => {
        expect(smallButton).toHaveStyle({
          backgroundColor: expect.stringContaining("orange"),
        });
      });
    });

    it("should show filter pills in compact view", () => {
      const savedFilters = {
        country: "DE",
        sizes: ["small", "medium"],
        ages: [],
      };
      localStorage.setItem("swipeFilters", JSON.stringify(savedFilters));

      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} compact />);

      expect(screen.getByText(/🇩🇪 Germany/)).toBeInTheDocument();
      expect(screen.getByText(/Small & Medium/)).toBeInTheDocument();
    });
  });

  describe("Filter Updates", () => {
    it("should update queue on filter change", async () => {
      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      const countrySelect = screen.getByLabelText("Country");
      fireEvent.change(countrySelect, { target: { value: "US" } });

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          country: "US",
          sizes: [],
          ages: [],
        });
      });

      const largeButton = screen.getByRole("button", { name: /Large/i });
      fireEvent.click(largeButton);

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          country: "US",
          sizes: ["large"],
          ages: [],
        });
      });
    });

    it("should allow clearing all size filters", () => {
      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      const smallButton = screen.getByRole("button", { name: /Small/i });
      const mediumButton = screen.getByRole("button", { name: /Medium/i });

      // Select sizes first
      fireEvent.click(smallButton);
      fireEvent.click(mediumButton);

      // Now the clear button should be visible
      const clearButton = screen.getByRole("button", { name: /Clear sizes/i });
      fireEvent.click(clearButton);

      expect(smallButton).not.toHaveClass("selected");
      expect(mediumButton).not.toHaveClass("selected");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      expect(
        screen.getByLabelText(/Select adoption country/i),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Filter by dog size/i)).toBeInTheDocument();
    });

    it("should be keyboard navigable", () => {
      render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

      const countrySelect = screen.getByLabelText("Country");
      const smallButton = screen.getByRole("button", { name: /Small/i });

      countrySelect.focus();
      expect(document.activeElement).toBe(countrySelect);

      fireEvent.keyDown(countrySelect, { key: "Tab" });
      smallButton.focus();
      expect(document.activeElement).toBe(smallButton);
    });
  });
});
