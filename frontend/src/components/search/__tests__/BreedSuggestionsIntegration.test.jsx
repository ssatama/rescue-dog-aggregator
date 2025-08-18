import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "@testing-library/react";
import SearchTypeahead from "../SearchTypeahead";
import { getBreedSuggestions } from "../../../services/animalsService";

// Mock the service
jest.mock("../../../services/animalsService", () => ({
  getBreedSuggestions: jest.fn(),
}));

describe("Breed Suggestions Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API response
    getBreedSuggestions.mockResolvedValue([
      "Golden Retriever",
      "Golden Retriever Mix",
    ]);
  });

  it("fetches and displays breed suggestions when typing", async () => {
    const mockOnValueChange = jest.fn();

    render(
      <SearchTypeahead
        value=""
        placeholder="Search breeds..."
        onValueChange={mockOnValueChange}
        fetchSuggestions={getBreedSuggestions}
        debounceMs={100}
        maxSuggestions={5}
      />,
    );

    const input = screen.getByPlaceholderText("Search breeds...");

    // Type "Golden" in the input
    fireEvent.change(input, { target: { value: "Golden" } });

    // Verify onValueChange was called
    expect(mockOnValueChange).toHaveBeenCalledWith("Golden");

    // Wait for debounce and API call
    await act(async () => {
      jest.advanceTimersByTime(150);
    });

    // Wait for suggestions to appear
    await waitFor(
      () => {
        expect(getBreedSuggestions).toHaveBeenCalledWith("Golden");
      },
      { timeout: 1000 },
    );

    // Check if suggestions are displayed
    await waitFor(
      () => {
        expect(screen.getByText("Golden Retriever")).toBeInTheDocument();
        expect(screen.getByText("Golden Retriever Mix")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("handles API errors gracefully", async () => {
    const mockOnValueChange = jest.fn();

    // Mock API failure
    getBreedSuggestions.mockRejectedValue(new Error("API Error"));

    render(
      <SearchTypeahead
        value=""
        placeholder="Search breeds..."
        onValueChange={mockOnValueChange}
        fetchSuggestions={getBreedSuggestions}
        debounceMs={100}
      />,
    );

    const input = screen.getByPlaceholderText("Search breeds...");

    // Type in the input
    fireEvent.change(input, { target: { value: "Golden" } });

    // Wait for debounce and API call
    await act(async () => {
      jest.advanceTimersByTime(150);
    });

    // Wait a bit to let error handling occur
    await waitFor(
      () => {
        expect(getBreedSuggestions).toHaveBeenCalledWith("Golden");
      },
      { timeout: 1000 },
    );

    // Should not crash and input should still work
    expect(input.value).toBe("Golden");
    expect(mockOnValueChange).toHaveBeenCalledWith("Golden");
  });

  it("handles non-string suggestions gracefully", async () => {
    const mockOnValueChange = jest.fn();

    // Mock API returning mixed types (this should not happen in real API, but testing robustness)
    getBreedSuggestions.mockResolvedValue([
      "Golden Retriever",
      null,
      undefined,
      123,
      "Golden Retriever Mix",
    ]);

    render(
      <SearchTypeahead
        value=""
        placeholder="Search breeds..."
        onValueChange={mockOnValueChange}
        fetchSuggestions={getBreedSuggestions}
        debounceMs={100}
      />,
    );

    const input = screen.getByPlaceholderText("Search breeds...");

    // Type in the input
    fireEvent.change(input, { target: { value: "Golden" } });

    // Wait for debounce and API call
    await act(async () => {
      jest.advanceTimersByTime(150);
    });

    // Wait for suggestions to appear
    await waitFor(
      () => {
        expect(getBreedSuggestions).toHaveBeenCalledWith("Golden");
      },
      { timeout: 1000 },
    );

    // Should only show valid string suggestions
    await waitFor(
      () => {
        expect(screen.getByText("Golden Retriever")).toBeInTheDocument();
        expect(screen.getByText("Golden Retriever Mix")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    // Should not show invalid values
    expect(screen.queryByText("123")).not.toBeInTheDocument();
  });

  it("allows selecting suggestions", async () => {
    const mockOnValueChange = jest.fn();
    const mockOnSuggestionSelect = jest.fn();

    render(
      <SearchTypeahead
        value=""
        placeholder="Search breeds..."
        onValueChange={mockOnValueChange}
        onSuggestionSelect={mockOnSuggestionSelect}
        fetchSuggestions={getBreedSuggestions}
        debounceMs={100}
      />,
    );

    const input = screen.getByPlaceholderText("Search breeds...");

    // Type in the input
    fireEvent.change(input, { target: { value: "Golden" } });

    // Wait for debounce and API call
    await act(async () => {
      jest.advanceTimersByTime(150);
    });

    // Wait for suggestions to appear
    await waitFor(
      () => {
        expect(screen.getByText("Golden Retriever")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    // Click on the first suggestion
    fireEvent.click(screen.getByText("Golden Retriever"));

    // Verify callbacks were called
    expect(mockOnSuggestionSelect).toHaveBeenCalledWith("Golden Retriever");
    expect(mockOnValueChange).toHaveBeenCalledWith("Golden Retriever");
  });
});
