import React, { useState } from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchTypeahead from "../SearchTypeahead";

// Mock framer-motion to avoid animation issues in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => children,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("SearchTypeahead", () => {
  const defaultProps = {
    value: "",
    onValueChange: jest.fn(),
    placeholder: "Search dogs...",
    fetchSuggestions: jest.fn(() => Promise.resolve(["Bella", "Max"])),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe("Basic Rendering", () => {
    it("renders with placeholder text", () => {
      render(<SearchTypeahead {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search dogs...");
      expect(input).toBeInTheDocument();
    });

    it("displays the current value", () => {
      render(<SearchTypeahead {...defaultProps} value="Bella" />);
      const input = screen.getByDisplayValue("Bella");
      expect(input).toBeInTheDocument();
    });

    it("shows clear button when there is a value", () => {
      render(<SearchTypeahead {...defaultProps} value="test" />);
      const clearButton = screen.getByLabelText("Clear search");
      expect(clearButton).toBeInTheDocument();
    });

    it("does not show clear button when value is empty", () => {
      render(<SearchTypeahead {...defaultProps} />);
      const clearButton = screen.queryByLabelText("Clear search");
      expect(clearButton).not.toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("calls onValueChange when typing", async () => {
      const user = userEvent.setup();
      render(<SearchTypeahead {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search dogs...");

      await user.type(input, "Max");

      expect(defaultProps.onValueChange).toHaveBeenCalledWith("M");
      expect(defaultProps.onValueChange).toHaveBeenCalledWith("Ma");
      expect(defaultProps.onValueChange).toHaveBeenCalledWith("Max");
    });

    it("clears the input when clear button is clicked", async () => {
      const user = userEvent.setup();
      render(<SearchTypeahead {...defaultProps} value="test" />);
      const clearButton = screen.getByLabelText("Clear search");

      await user.click(clearButton);

      expect(defaultProps.onValueChange).toHaveBeenCalledWith("");
    });

    it("fetches suggestions after debounce delay", async () => {
      const mockFetch = jest.fn(() => Promise.resolve(["Bella", "Max"]));
      render(
        <SearchTypeahead
          {...defaultProps}
          value="Bel"
          fetchSuggestions={mockFetch}
          debounceMs={0} // Remove debounce for testing
        />,
      );

      const input = screen.getByPlaceholderText("Search dogs...");

      fireEvent.focus(input);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("Bel");
      });
    });

    it("displays suggestions when available", async () => {
      const mockFetch = jest.fn(() => Promise.resolve(["Bella", "Max"]));
      const onValueChange = jest.fn();

      // Use a wrapper component to manage state properly
      const TestWrapper = () => {
        const [value, setValue] = useState("");
        return (
          <SearchTypeahead
            {...defaultProps}
            value={value}
            fetchSuggestions={mockFetch}
            onValueChange={(newValue) => {
              setValue(newValue);
              onValueChange(newValue);
            }}
            debounceMs={0} // Remove debounce for testing
            skipLocalFuzzySearch={true} // Skip fuzzy search to use results directly
          />
        );
      };

      render(<TestWrapper />);

      const input = screen.getByPlaceholderText("Search dogs...");

      // Type in the input to trigger search - use a value that would match
      fireEvent.change(input, { target: { value: "bel" } });

      // Focus the input to show suggestions
      fireEvent.focus(input);

      // Wait for the fetch to be called and suggestions to appear
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("bel");
      });

      await waitFor(() => {
        expect(screen.getByText("Bella")).toBeInTheDocument();
        expect(screen.getByText("Max")).toBeInTheDocument();
      });
    });

    it("selects suggestion on click", async () => {
      const user = userEvent.setup();
      const mockFetch = jest.fn(() => Promise.resolve(["Bella", "Max"]));
      const onValueChange = jest.fn();

      // Use a wrapper component to manage state properly
      const TestWrapper = () => {
        const [value, setValue] = useState("");
        return (
          <SearchTypeahead
            {...defaultProps}
            value={value}
            fetchSuggestions={mockFetch}
            onValueChange={(newValue) => {
              setValue(newValue);
              onValueChange(newValue);
            }}
            debounceMs={0} // Remove debounce for testing
            skipLocalFuzzySearch={true} // Skip fuzzy search to use results directly
          />
        );
      };

      render(<TestWrapper />);

      const input = screen.getByPlaceholderText("Search dogs...");

      // Type in the input to trigger search
      fireEvent.change(input, { target: { value: "bel" } });

      // Focus to trigger suggestions
      fireEvent.focus(input);

      // Wait for suggestions to appear
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("bel");
      });

      await waitFor(() => {
        expect(screen.getByText("Bella")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Bella"));

      expect(onValueChange).toHaveBeenCalledWith("Bella");
    });
  });

  describe("Keyboard Navigation", () => {
    it("navigates suggestions with arrow keys", async () => {
      const mockFetch = jest.fn(() => Promise.resolve(["Bella", "Max"]));

      // Use a wrapper component to manage state properly
      const TestWrapper = () => {
        const [value, setValue] = useState("");
        return (
          <SearchTypeahead
            {...defaultProps}
            value={value}
            fetchSuggestions={mockFetch}
            onValueChange={setValue}
            debounceMs={0} // Remove debounce for testing
            skipLocalFuzzySearch={true} // Skip fuzzy search to use results directly
          />
        );
      };

      render(<TestWrapper />);

      const input = screen.getByPlaceholderText("Search dogs...");

      // Type in the input to trigger search - use a value that would match
      fireEvent.change(input, { target: { value: "bel" } });

      fireEvent.focus(input);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("bel");
      });

      await waitFor(() => {
        expect(screen.getByText("Bella")).toBeInTheDocument();
      });

      // Press down arrow
      fireEvent.keyDown(input, { key: "ArrowDown" });

      // First suggestion should be highlighted (check by class)
      const firstSuggestion = screen.getByText("Bella").closest("button");
      expect(firstSuggestion).toHaveClass("bg-accent");

      // Press down arrow again
      fireEvent.keyDown(input, { key: "ArrowDown" });

      // Second suggestion should be highlighted
      const secondSuggestion = screen.getByText("Max").closest("button");
      expect(secondSuggestion).toHaveClass("bg-accent");

      // Press up arrow
      fireEvent.keyDown(input, { key: "ArrowUp" });

      // First suggestion should be highlighted again
      expect(firstSuggestion).toHaveClass("bg-accent");
    });

    it("selects suggestion with Enter key", async () => {
      const mockFetch = jest.fn(() => Promise.resolve(["Bella", "Max"]));
      const onValueChange = jest.fn();

      // Use a wrapper component to manage state properly
      const TestWrapper = () => {
        const [value, setValue] = useState("");
        return (
          <SearchTypeahead
            {...defaultProps}
            value={value}
            fetchSuggestions={mockFetch}
            onValueChange={(newValue) => {
              setValue(newValue);
              onValueChange(newValue);
            }}
            debounceMs={0} // Remove debounce for testing
            skipLocalFuzzySearch={true} // Skip fuzzy search to use results directly
          />
        );
      };

      render(<TestWrapper />);

      const input = screen.getByPlaceholderText("Search dogs...");

      // Type in the input to trigger search - use a value that would match
      fireEvent.change(input, { target: { value: "bel" } });

      fireEvent.focus(input);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("bel");
      });

      await waitFor(() => {
        expect(screen.getByText("Bella")).toBeInTheDocument();
      });

      // Navigate to first suggestion
      fireEvent.keyDown(input, { key: "ArrowDown" });

      // Select with Enter
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onValueChange).toHaveBeenCalledWith("Bella");
    });

    it("closes suggestions with Escape key", async () => {
      const mockFetch = jest.fn(() => Promise.resolve(["Bella", "Max"]));

      // Use a wrapper component to manage state properly
      const TestWrapper = () => {
        const [value, setValue] = useState("");
        return (
          <SearchTypeahead
            {...defaultProps}
            value={value}
            fetchSuggestions={mockFetch}
            onValueChange={setValue}
            debounceMs={0} // Remove debounce for testing
            skipLocalFuzzySearch={true} // Skip fuzzy search to use results directly
          />
        );
      };

      render(<TestWrapper />);

      const input = screen.getByPlaceholderText("Search dogs...");

      // Type in the input to trigger search - use a value that would match
      fireEvent.change(input, { target: { value: "bel" } });

      fireEvent.focus(input);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("bel");
      });

      await waitFor(() => {
        expect(screen.getByText("Bella")).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(input, { key: "Escape" });

      // Suggestions should be hidden
      await waitFor(() => {
        expect(screen.queryByText("Bella")).not.toBeInTheDocument();
      });
    });
  });

  describe("Search History", () => {
    it("saves search to history when enabled", async () => {
      const user = userEvent.setup();
      const onSuggestionSelect = jest.fn();
      const mockFetch = jest.fn(() => Promise.resolve(["Bella", "Max"]));

      render(
        <SearchTypeahead
          {...defaultProps}
          showHistory={true}
          value="Bella"
          onSuggestionSelect={onSuggestionSelect}
          fetchSuggestions={mockFetch}
          debounceMs={0} // Remove debounce for testing
        />,
      );

      const input = screen.getByPlaceholderText("Search dogs...");

      // Focus to trigger suggestions
      fireEvent.focus(input);

      // Wait for suggestions to load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("Bella");
      });

      await waitFor(() => {
        expect(screen.getByText("Bella")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Bella"));

      // Check that the suggestion was selected
      expect(onSuggestionSelect).toHaveBeenCalledWith("Bella");

      // Check localStorage
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedHistory = JSON.parse(
        localStorageMock.setItem.mock.calls[0][1],
      );
      expect(savedHistory).toContain("Bella");
    });

    it("displays recent searches when input is empty", async () => {
      // Pre-populate history with correct key
      localStorageMock.setItem(
        "search-history",
        JSON.stringify(["Recent1", "Recent2"]),
      );

      render(<SearchTypeahead {...defaultProps} showHistory={true} value="" />);
      const input = screen.getByPlaceholderText("Search dogs...");

      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.getByText("Recent searches")).toBeInTheDocument();
        expect(screen.getByText("Recent1")).toBeInTheDocument();
        expect(screen.getByText("Recent2")).toBeInTheDocument();
      });
    });

    it("limits history to maxHistoryItems", async () => {
      const history = Array.from({ length: 10 }, (_, i) => `Item${i}`);
      localStorageMock.setItem("search-history", JSON.stringify(history));

      render(
        <SearchTypeahead
          {...defaultProps}
          showHistory={true}
          maxHistoryItems={5}
          value=""
        />,
      );
      const input = screen.getByPlaceholderText("Search dogs...");

      fireEvent.focus(input);

      // Wait for history to be displayed
      await waitFor(() => {
        expect(screen.getByText("Recent searches")).toBeInTheDocument();
      });

      // Should only show first 5 items from history (most recent)
      expect(screen.getByText("Item0")).toBeInTheDocument();
      expect(screen.getByText("Item1")).toBeInTheDocument();
      expect(screen.getByText("Item2")).toBeInTheDocument();
      expect(screen.getByText("Item3")).toBeInTheDocument();
      expect(screen.getByText("Item4")).toBeInTheDocument();

      // Should NOT show items beyond the limit
      expect(screen.queryByText("Item5")).not.toBeInTheDocument();
      expect(screen.queryByText("Item9")).not.toBeInTheDocument();
    });
  });

  describe("Loading States", () => {
    it("shows loading indicator while fetching", async () => {
      const slowFetch = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );

      render(
        <SearchTypeahead
          {...defaultProps}
          value="test"
          fetchSuggestions={slowFetch}
        />,
      );

      const input = screen.getByPlaceholderText("Search dogs...");
      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.getByText("Searching...")).toBeInTheDocument();
      });
    });

    it("shows no results message when empty", async () => {
      const emptyFetch = jest.fn(() => Promise.resolve([]));

      // Use a wrapper component to manage state properly
      const TestWrapper = () => {
        const [value, setValue] = useState("");
        return (
          <SearchTypeahead
            {...defaultProps}
            value={value}
            fetchSuggestions={emptyFetch}
            onValueChange={setValue}
            debounceMs={0} // Remove debounce for testing
            skipLocalFuzzySearch={true} // Skip fuzzy search to use results directly
          />
        );
      };

      render(<TestWrapper />);

      const input = screen.getByPlaceholderText("Search dogs...");

      // Type in the input to trigger search
      fireEvent.change(input, { target: { value: "xyz" } });

      fireEvent.focus(input);

      await waitFor(() => {
        expect(emptyFetch).toHaveBeenCalledWith("xyz");
      });

      await waitFor(() => {
        expect(screen.getByText("No suggestions found")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("handles fetch errors gracefully", async () => {
      const errorFetch = jest.fn(() =>
        Promise.reject(new Error("Network error")),
      );
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Use a wrapper component to manage state properly
      const TestWrapper = () => {
        const [value, setValue] = useState("");
        return (
          <SearchTypeahead
            {...defaultProps}
            value={value}
            fetchSuggestions={errorFetch}
            onValueChange={setValue}
            debounceMs={0} // Remove debounce for testing
            skipLocalFuzzySearch={true} // Skip fuzzy search to use results directly
          />
        );
      };

      render(<TestWrapper />);

      const input = screen.getByPlaceholderText("Search dogs...");

      // Type in the input to trigger search - use a value that would trigger
      fireEvent.change(input, { target: { value: "bel" } });

      fireEvent.focus(input);

      await waitFor(() => {
        expect(errorFetch).toHaveBeenCalledWith("bel");
      });

      await waitFor(() => {
        expect(
          screen.getByText("Unable to fetch suggestions. Please try again."),
        ).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      render(<SearchTypeahead {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search dogs...");

      expect(input).toHaveAttribute("role", "combobox");
      expect(input).toHaveAttribute("aria-autocomplete", "list");
      expect(input).toHaveAttribute("aria-expanded", "false");
    });

    it("updates aria-expanded when suggestions are shown", async () => {
      render(<SearchTypeahead {...defaultProps} value="test" />);
      const input = screen.getByPlaceholderText("Search dogs...");

      fireEvent.focus(input);

      await waitFor(() => {
        expect(input).toHaveAttribute("aria-expanded", "true");
      });
    });

    it("announces suggestions to screen readers", async () => {
      const mockFetch = jest.fn(() => Promise.resolve(["Bella", "Max"]));

      // Use a wrapper component to manage state properly
      const TestWrapper = () => {
        const [value, setValue] = useState("");
        return (
          <SearchTypeahead
            {...defaultProps}
            value={value}
            fetchSuggestions={mockFetch}
            onValueChange={setValue}
            debounceMs={0} // Remove debounce for testing
            skipLocalFuzzySearch={true} // Skip fuzzy search to use results directly
          />
        );
      };

      render(<TestWrapper />);

      const input = screen.getByPlaceholderText("Search dogs...");

      // Type in the input to trigger search - use a value that would match
      fireEvent.change(input, { target: { value: "bel" } });

      fireEvent.focus(input);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("bel");
      });

      await waitFor(() => {
        expect(screen.getByText("Bella")).toBeInTheDocument();
        expect(screen.getByText("Max")).toBeInTheDocument();
      });

      // Check that suggestions list is present with proper ARIA role
      const listbox = screen.getByRole("listbox");
      expect(listbox).toBeInTheDocument();

      // Check that suggestions are present as options
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(2);
    });
  });

  describe("Mobile Optimization", () => {
    it("renders with mobile size variant", () => {
      render(<SearchTypeahead {...defaultProps} size="lg" />);
      const input = screen.getByPlaceholderText("Search dogs...");
      // Check if large size is applied to input (size prop affects input dimensions)
      expect(input).toBeInTheDocument();
    });

    it("has larger touch targets on mobile", () => {
      render(<SearchTypeahead {...defaultProps} size="lg" />);
      const input = screen.getByPlaceholderText("Search dogs...");

      // Check if large size styles are applied
      expect(input.className).toMatch(/h-12/);
    });
  });
});
