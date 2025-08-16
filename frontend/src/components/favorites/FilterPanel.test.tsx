/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "../../test-utils";
import "@testing-library/jest-dom";
import FilterPanel from "./FilterPanel";

// Mock data for testing
const mockDogs = [
  {
    id: 1,
    name: "Buddy",
    breed: "Golden Retriever",
    age_min_months: 24,
    age_max_months: 24,
    age_months: 24,
    age_text: "2 years",
    sex: "male",
    size: "large",
    organization_name: "Happy Paws Rescue",
    organization: {
      name: "Happy Paws Rescue",
      country: "DE",
    },
  },
  {
    id: 2,
    name: "Luna",
    breed: "Labrador Mix",
    age_min_months: 36,
    age_max_months: 36,
    age_months: 36,
    age_text: "3 years",
    sex: "female",
    size: "medium",
    organization_name: "Save a Soul Rescue",
    organization: {
      name: "Save a Soul Rescue",
      country: "GB",
    },
  },
  {
    id: 3,
    name: "Max",
    breed: "German Shepherd",
    age_min_months: 48,
    age_max_months: 48,
    age_months: 48,
    age_text: "4 years",
    sex: "male",
    size: "large",
    organization_name: "Furry Friends",
    organization: {
      name: "Furry Friends",
      country: "NL",
    },
  },
  {
    id: 4,
    name: "Bella",
    breed: "Golden Retriever",
    age_min_months: 12,
    age_max_months: 12,
    age_months: 12,
    age_text: "1 year",
    sex: "female",
    size: "medium",
    organization_name: "Happy Paws Rescue",
    organization: {
      name: "Happy Paws Rescue",
      country: "DE",
    },
  },
];

describe("FilterPanel Component", () => {
  describe("Desktop View", () => {
    beforeEach(() => {
      // Mock desktop viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });
      window.dispatchEvent(new Event("resize"));
    });

    test("renders inline filter dropdowns on desktop", () => {
      render(<FilterPanel dogs={mockDogs} onFilter={jest.fn()} />);

      // Should show filter dropdowns directly without a button
      expect(screen.getByLabelText("Filter by breed")).toBeInTheDocument();
      expect(screen.getByLabelText("Filter by size")).toBeInTheDocument();
      expect(screen.getByLabelText("Filter by age")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Filter by organization"),
      ).toBeInTheDocument();
    });

    test("applies filters immediately on desktop", async () => {
      const onFilter = jest.fn();
      render(<FilterPanel dogs={mockDogs} onFilter={onFilter} />);

      const breedSelect = screen.getByLabelText("Filter by breed");

      // Click to open the Select dropdown
      fireEvent.click(breedSelect);

      // Wait for dropdown to open and click on "Golden Retriever"
      await waitFor(() => {
        expect(screen.getByText("Golden Retriever")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Golden Retriever"));

      // Wait for debounced filter (300ms)
      await waitFor(
        () => {
          expect(onFilter).toHaveBeenCalled();
        },
        { timeout: 400 },
      );

      // Should filter with user-initiated flag
      expect(onFilter).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ breed: "Golden Retriever", name: "Buddy" }),
          expect.objectContaining({ breed: "Golden Retriever", name: "Bella" }),
        ]),
        true,
      );
    });

    test("shows clear button when filters are active", async () => {
      render(<FilterPanel dogs={mockDogs} onFilter={jest.fn()} />);

      // Initially no clear button
      expect(
        screen.queryByRole("button", { name: /clear/i }),
      ).not.toBeInTheDocument();

      // Apply a filter
      const breedSelect = screen.getByLabelText("Filter by breed");

      // Click to open the Select dropdown
      fireEvent.click(breedSelect);

      // Wait for dropdown to open and click on "Golden Retriever"
      await waitFor(() => {
        expect(screen.getByText("Golden Retriever")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Golden Retriever"));

      // Clear button should appear
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /clear/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Filters on Desktop", () => {
    beforeEach(() => {
      // Mock desktop viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });
      window.dispatchEvent(new Event("resize"));
    });

    test("shows unique breeds from dogs", async () => {
      render(<FilterPanel dogs={mockDogs} onFilter={jest.fn()} />);

      const breedSelect = screen.getByLabelText("Filter by breed");
      expect(breedSelect).toBeInTheDocument();

      // Click to open the Select dropdown
      fireEvent.click(breedSelect);

      // Wait for dropdown to open and check options
      await waitFor(() => {
        expect(screen.getAllByText("All Breeds")).toHaveLength(2); // placeholder + option
        expect(screen.getByText("Golden Retriever")).toBeInTheDocument();
        expect(screen.getByText("Labrador Mix")).toBeInTheDocument();
        expect(screen.getByText("German Shepherd")).toBeInTheDocument();
      });
    });

    test("filters dogs by selected breed", async () => {
      const onFilter = jest.fn();
      render(<FilterPanel dogs={mockDogs} onFilter={onFilter} />);

      const breedSelect = screen.getByLabelText("Filter by breed");

      // Click to open the Select dropdown
      fireEvent.click(breedSelect);

      // Wait for dropdown to open and click on "Golden Retriever"
      await waitFor(() => {
        expect(screen.getByText("Golden Retriever")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Golden Retriever"));

      // Wait for debounced filter on desktop
      await waitFor(
        () => {
          expect(onFilter).toHaveBeenCalled();
        },
        { timeout: 400 },
      );

      expect(onFilter).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ breed: "Golden Retriever", name: "Buddy" }),
          expect.objectContaining({ breed: "Golden Retriever", name: "Bella" }),
        ]),
        true,
      );
    });

    test("shows age group filter with only available age groups", async () => {
      render(<FilterPanel dogs={mockDogs} onFilter={jest.fn()} />);

      const ageSelect = screen.getByLabelText("Filter by age");
      expect(ageSelect).toBeInTheDocument();

      // Click to open the Select dropdown
      fireEvent.click(ageSelect);

      // Wait for dropdown to open and check age group options
      await waitFor(() => {
        expect(screen.getAllByText("All Ages")).toHaveLength(2); // placeholder + option
        // Updated to match the emoji labels
        expect(screen.getByText("🐕 Young (1-3 years)")).toBeInTheDocument();
        expect(screen.getByText("🦮 Adult (3-8 years)")).toBeInTheDocument();
      });

      // Puppy and Senior should NOT be present since no dogs in mock data have those ages
      expect(screen.queryByText(/Puppy/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Senior/)).not.toBeInTheDocument();
    });

    test("filters dogs by age group", async () => {
      const onFilter = jest.fn();
      render(<FilterPanel dogs={mockDogs} onFilter={onFilter} />);

      const ageSelect = screen.getByLabelText("Filter by age");

      // Click to open the Select dropdown
      fireEvent.click(ageSelect);

      // Wait for dropdown to open and click on "Young"
      await waitFor(() => {
        expect(screen.getByText("🐕 Young (1-3 years)")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("🐕 Young (1-3 years)"));

      // Wait for debounced filter to apply (300ms delay)
      await waitFor(
        () => {
          // Young is 12-36 months (1-3 years, INCLUDING 36)
          // Bella: 12 months = Young ✓ (12 >= 12 && 12 <= 36)
          // Buddy: 24 months = Young ✓ (24 >= 12 && 24 <= 36)
          // Luna: 36 months = Young ✓ (36 >= 12 && 36 <= 36)
          // Max: 48 months = Adult ✗ (48 >= 36 but 48 > 36 for Young range)
          const lastCall =
            onFilter.mock.calls[onFilter.mock.calls.length - 1][0];
          expect(lastCall).toHaveLength(3);
        },
        { timeout: 400 },
      );

      const lastCall = onFilter.mock.calls[onFilter.mock.calls.length - 1][0];
      expect(lastCall).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "Bella", age_months: 12 }),
          expect.objectContaining({ name: "Buddy", age_months: 24 }),
          expect.objectContaining({ name: "Luna", age_months: 36 }),
        ]),
      );

      // Should not contain Max (48 months = Adult)
      expect(lastCall.find((d: any) => d.name === "Max")).toBeUndefined();
    });

    test("shows size options", async () => {
      render(<FilterPanel dogs={mockDogs} onFilter={jest.fn()} />);

      const sizeSelect = screen.getByLabelText("Filter by size");
      expect(sizeSelect).toBeInTheDocument();

      // Click to open the Select dropdown
      fireEvent.click(sizeSelect);

      // Wait for dropdown to open and check options
      await waitFor(() => {
        expect(screen.getAllByText("All Sizes")).toHaveLength(2); // placeholder + option
        expect(screen.getByText("large")).toBeInTheDocument();
        expect(screen.getByText("medium")).toBeInTheDocument();
      });
    });

    test("filters dogs by size", async () => {
      const onFilter = jest.fn();
      render(<FilterPanel dogs={mockDogs} onFilter={onFilter} />);

      const sizeSelect = screen.getByLabelText("Filter by size");

      // Click to open the Select dropdown
      fireEvent.click(sizeSelect);

      // Wait for dropdown to open and click on "medium"
      await waitFor(() => {
        expect(screen.getByText("medium")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("medium"));

      // Wait for debounced filter
      await waitFor(
        () => {
          expect(onFilter).toHaveBeenCalled();
        },
        { timeout: 400 },
      );

      expect(onFilter).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: "Luna", size: "medium" }),
          expect.objectContaining({ name: "Bella", size: "medium" }),
        ]),
        true,
      );
    });

    test("shows unique organizations", async () => {
      render(<FilterPanel dogs={mockDogs} onFilter={jest.fn()} />);

      const orgSelect = screen.getByLabelText("Filter by organization");
      expect(orgSelect).toBeInTheDocument();

      // Click to open the Select dropdown
      fireEvent.click(orgSelect);

      // Wait for dropdown to open and check options
      await waitFor(() => {
        expect(screen.getAllByText("All Organizations")).toHaveLength(2); // placeholder + option
        expect(screen.getByText("Happy Paws Rescue")).toBeInTheDocument();
        expect(screen.getByText("Save a Soul Rescue")).toBeInTheDocument();
        expect(screen.getByText("Furry Friends")).toBeInTheDocument();
      });
    });

    test("filters dogs by organization", async () => {
      const onFilter = jest.fn();
      render(<FilterPanel dogs={mockDogs} onFilter={onFilter} />);

      const orgSelect = screen.getByLabelText("Filter by organization");

      // Click to open the Select dropdown
      fireEvent.click(orgSelect);

      // Wait for dropdown to open and click on "Happy Paws Rescue"
      await waitFor(() => {
        expect(screen.getByText("Happy Paws Rescue")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Happy Paws Rescue"));

      // Wait for debounced filter
      await waitFor(
        () => {
          expect(onFilter).toHaveBeenCalled();
        },
        { timeout: 400 },
      );

      expect(onFilter).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: "Buddy",
            organization_name: "Happy Paws Rescue",
          }),
          expect.objectContaining({
            name: "Bella",
            organization_name: "Happy Paws Rescue",
          }),
        ]),
        true,
      );
    });

    test("handles empty dogs array gracefully", async () => {
      const onFilter = jest.fn();
      render(<FilterPanel dogs={[]} onFilter={onFilter} />);

      // Should render without errors
      expect(screen.getByLabelText("Filter by breed")).toBeInTheDocument();

      // Click to open the Select dropdown
      const breedSelect = screen.getByLabelText("Filter by breed");
      fireEvent.click(breedSelect);

      // Wait for dropdown to open and check that only "All Breeds" is available
      await waitFor(() => {
        expect(screen.getAllByText("All Breeds")).toHaveLength(2); // placeholder + option
      });

      // Should not have any breed options other than the default
      expect(screen.queryByText("Golden Retriever")).not.toBeInTheDocument();
      expect(screen.queryByText("Labrador Mix")).not.toBeInTheDocument();
    });

    test("shows all age groups when dogs span all age ranges", async () => {
      const allAgesDogs = [
        {
          id: 1,
          name: "Puppy",
          age_min_months: 6,
          age_max_months: 6,
          age_months: 6,
          breed: "Beagle",
          size: "small",
          organization_name: "Test Org",
        },
        {
          id: 2,
          name: "Young",
          age_min_months: 18,
          age_max_months: 18,
          age_months: 18,
          breed: "Labrador",
          size: "large",
          organization_name: "Test Org",
        },
        {
          id: 3,
          name: "Adult",
          age_min_months: 60,
          age_max_months: 60,
          age_months: 60,
          breed: "Retriever",
          size: "large",
          organization_name: "Test Org",
        },
        {
          id: 4,
          name: "Senior",
          age_min_months: 120,
          age_max_months: 120,
          age_months: 120,
          breed: "Shepherd",
          size: "large",
          organization_name: "Test Org",
        },
      ];

      const onFilter = jest.fn();
      render(<FilterPanel dogs={allAgesDogs} onFilter={onFilter} />);

      const ageSelect = screen.getByLabelText("Filter by age");

      // Click to open the Select dropdown
      fireEvent.click(ageSelect);

      // Wait for dropdown to open and check all age group options
      await waitFor(() => {
        expect(screen.getAllByText("All Ages")).toHaveLength(2); // placeholder + option
        expect(screen.getByText("🐶 Puppy (<1 year)")).toBeInTheDocument();
        expect(screen.getByText("🐕 Young (1-3 years)")).toBeInTheDocument();
        expect(screen.getByText("🦮 Adult (3-8 years)")).toBeInTheDocument();
        expect(screen.getByText("🐕‍🦺 Senior (8+ years)")).toBeInTheDocument();
      });
    });

    test("applies multiple filters together", async () => {
      const onFilter = jest.fn();
      render(<FilterPanel dogs={mockDogs} onFilter={onFilter} />);

      // Apply size filter
      const sizeSelect = screen.getByLabelText("Filter by size");

      // Click to open the Select dropdown and select "large"
      fireEvent.click(sizeSelect);
      await waitFor(() => {
        expect(screen.getByText("large")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("large"));

      // Wait for first filter to apply
      await waitFor(
        () => {
          expect(onFilter).toHaveBeenCalled();
        },
        { timeout: 400 },
      );

      // Apply age filter
      const ageSelect = screen.getByLabelText("Filter by age");

      // Click to open the Select dropdown and select "Adult"
      fireEvent.click(ageSelect);
      await waitFor(() => {
        expect(screen.getByText("🦮 Adult (3-8 years)")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("🦮 Adult (3-8 years)"));

      // Wait for second filter to apply
      await waitFor(
        () => {
          const calls = onFilter.mock.calls;
          // Check if the last call contains the expected result
          if (calls.length >= 2) {
            const lastCall = calls[calls.length - 1][0];
            return lastCall.length === 1 && lastCall[0].name === "Max";
          }
          return false;
        },
        { timeout: 400 },
      );

      // Should only return Max (large size, 48 months = Adult)
      expect(onFilter).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: "Max",
            size: "large",
            age_months: 48,
          }),
        ]),
        true,
      );
    });

    test("clears all filters when clear button clicked", async () => {
      const onFilter = jest.fn();
      render(<FilterPanel dogs={mockDogs} onFilter={onFilter} />);

      // Apply a filter
      const sizeSelect = screen.getByLabelText("Filter by size");

      // Click to open the Select dropdown
      fireEvent.click(sizeSelect);

      // Wait for dropdown to open and click on "medium"
      await waitFor(() => {
        expect(screen.getByText("medium")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("medium"));

      // Wait for filter to apply
      await waitFor(
        () => {
          expect(onFilter).toHaveBeenCalled();
        },
        { timeout: 400 },
      );

      // Clear button should appear
      const clearButton = screen.getByRole("button", { name: /clear/i });
      fireEvent.click(clearButton);

      // All filters should be reset - onFilter should be called with all dogs
      expect(onFilter).toHaveBeenLastCalledWith(mockDogs, true);
    });
  });

  describe("Mobile View", () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event("resize"));
    });

    test("shows single filter button on mobile", () => {
      render(<FilterPanel dogs={mockDogs} onFilter={jest.fn()} />);

      // Should show a single button instead of inline dropdowns
      const filterButton = screen.getByRole("button", {
        name: /filter/i,
      });
      expect(filterButton).toBeInTheDocument();

      // Should not show dropdowns directly
      expect(
        screen.queryByLabelText("Filter by breed"),
      ).not.toBeInTheDocument();
    });

    test("opens as bottom sheet when filter button clicked", () => {
      render(<FilterPanel dogs={mockDogs} onFilter={jest.fn()} />);

      const filterButton = screen.getByRole("button", {
        name: /filter/i,
      });
      fireEvent.click(filterButton);

      // Bottom sheet should be visible
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Filter Your Favorites")).toBeInTheDocument();
    });

    test("shows filter count in button when filters active", async () => {
      render(<FilterPanel dogs={mockDogs} onFilter={jest.fn()} />);

      // Open filter panel
      fireEvent.click(screen.getByRole("button", { name: /filter/i }));

      // Apply a filter using Select component
      const breedSelect = screen.getByLabelText("Breed");

      // Click to open the Select dropdown
      fireEvent.click(breedSelect);

      // Wait for dropdown to open and click on "Golden Retriever"
      await waitFor(() => {
        expect(screen.getByText("Golden Retriever")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Golden Retriever"));

      // Close panel
      fireEvent.click(screen.getByLabelText("Close"));

      // Button should show count as a badge, not in the name
      const button = screen.getByRole("button", { name: /filter/i });
      expect(button).toBeInTheDocument();
      // Check for the count badge element
      const countBadge = button.querySelector(".bg-orange-600");
      expect(countBadge).toHaveTextContent("1");
    });

    test("applies filters when Apply button clicked", async () => {
      const onFilter = jest.fn();
      render(<FilterPanel dogs={mockDogs} onFilter={onFilter} />);

      // Open panel
      fireEvent.click(screen.getByRole("button", { name: /filter/i }));

      // Apply filters using Select component
      const sizeSelect = screen.getByLabelText("Size");

      // Click to open the Select dropdown
      fireEvent.click(sizeSelect);

      // Wait for dropdown to open and click on "medium"
      await waitFor(() => {
        expect(screen.getByText("medium")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("medium"));

      // Click Apply
      const applyButton = screen.getByRole("button", {
        name: /apply filters/i,
      });
      fireEvent.click(applyButton);

      // Should filter with user-initiated flag and close panel
      expect(onFilter).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: "Luna", size: "medium" }),
          expect.objectContaining({ name: "Bella", size: "medium" }),
        ]),
        true,
      );
    });

    test("shows drag handle for bottom sheet", () => {
      render(<FilterPanel dogs={mockDogs} onFilter={jest.fn()} />);

      fireEvent.click(screen.getByRole("button", { name: /filter/i }));

      // Check for drag handle (visual indicator) - updated selector
      const dragHandle = document.querySelector(".w-14.h-1\\.5.bg-gray-300");
      expect(dragHandle).toBeInTheDocument();
    });

    test("closes bottom sheet on backdrop click", () => {
      render(<FilterPanel dogs={mockDogs} onFilter={jest.fn()} />);

      fireEvent.click(screen.getByRole("button", { name: /filter/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Click backdrop
      const backdrop = document.querySelector(".backdrop");
      fireEvent.click(backdrop!);

      // Panel should close
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    test("desktop dropdowns have proper ARIA labels", () => {
      // Mock desktop viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });
      window.dispatchEvent(new Event("resize"));

      render(<FilterPanel dogs={mockDogs} onFilter={jest.fn()} />);

      expect(screen.getByLabelText("Filter by breed")).toBeInTheDocument();
      expect(screen.getByLabelText("Filter by size")).toBeInTheDocument();
      expect(screen.getByLabelText("Filter by age")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Filter by organization"),
      ).toBeInTheDocument();
    });

    test("mobile panel has proper ARIA labels", () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event("resize"));

      render(<FilterPanel dogs={mockDogs} onFilter={jest.fn()} />);

      fireEvent.click(screen.getByRole("button", { name: /filter/i }));

      expect(screen.getByRole("dialog")).toHaveAttribute(
        "aria-label",
        "Filter panel",
      );
      expect(screen.getByLabelText("Breed")).toBeInTheDocument();
      expect(screen.getByLabelText("Size")).toBeInTheDocument();
      expect(screen.getByLabelText("Age Group")).toBeInTheDocument();
      expect(screen.getByLabelText("Organization")).toBeInTheDocument();
    });

    test("supports keyboard navigation on mobile", () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event("resize"));

      render(<FilterPanel dogs={mockDogs} onFilter={jest.fn()} />);

      const filterButton = screen.getByRole("button", {
        name: /filter/i,
      });

      // Click to open panel (Enter key would submit form, not open panel)
      fireEvent.click(filterButton);
      expect(screen.getByText("Filter Your Favorites")).toBeInTheDocument();

      // Escape key closes panel
      fireEvent.keyDown(document, { key: "Escape" });
      expect(
        screen.queryByText("Filter Your Favorites"),
      ).not.toBeInTheDocument();
    });

    test("focus management for desktop dropdowns", () => {
      // Mock desktop viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });
      window.dispatchEvent(new Event("resize"));

      render(<FilterPanel dogs={mockDogs} onFilter={jest.fn()} />);

      const breedSelect = screen.getByLabelText("Filter by breed");

      // Should be focusable
      breedSelect.focus();
      expect(document.activeElement).toBe(breedSelect);
    });
  });
});
