import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import SwipeOnboarding from "../SwipeOnboarding";

// Mock lucide-react PawPrint
jest.mock("lucide-react", () => ({
  PawPrint: (props: Record<string, unknown>) => (
    <svg data-testid="paw-print-icon" {...props} />
  ),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe("SwipeOnboarding", () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    mockOnComplete.mockClear();
    localStorage.clear();

    // Mock fetch responses for country and size counts
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/api/dogs/available-countries")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              countries: [
                { code: "DE", name: "Germany", dog_count: 486 },
                { code: "GB", name: "United Kingdom", dog_count: 1245 },
                { code: "US", name: "United States", dog_count: 342 },
              ],
            }),
        });
      }
      if (url.includes("adoptable_to_country=DE")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total: 486, dogs: [] }),
        });
      }
      if (url.includes("adoptable_to_country=GB")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total: 1245, dogs: [] }),
        });
      }
      if (url.includes("adoptable_to_country=US")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total: 342, dogs: [] }),
        });
      }
      if (url.includes("size=")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total: 100, dogs: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ total: 0, dogs: [] }),
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("First-Time User Detection", () => {
    it("should show onboarding for new users", () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      expect(screen.getByText(/Where can you adopt/i)).toBeInTheDocument();
    });

    it("should not show onboarding for returning users", () => {
      localStorage.setItem("swipeOnboardingComplete", "true");
      localStorage.setItem(
        "swipeFilters",
        JSON.stringify({ country: "DE", sizes: [] }),
      );

      const { container } = render(
        <SwipeOnboarding onComplete={mockOnComplete} />,
      );

      expect(container.firstChild).toBeNull();
      expect(mockOnComplete).toHaveBeenCalledWith(true);
    });

    it("should show onboarding if filters are not set", () => {
      localStorage.setItem("swipeOnboardingComplete", "true");

      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      expect(screen.getByText(/Where can you adopt/i)).toBeInTheDocument();
    });
  });

  describe("Country Selection Step", () => {
    it("should display available countries with dog counts", async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/Germany/)).toBeInTheDocument();
      });

      expect(screen.getByText(/486 dogs available/)).toBeInTheDocument();
      expect(screen.getByText(/United Kingdom/)).toBeInTheDocument();
      expect(screen.getByText(/1245 dogs available/)).toBeInTheDocument();
      expect(screen.getByText(/United States/)).toBeInTheDocument();
      expect(screen.getByText(/342 dogs available/)).toBeInTheDocument();
    });

    it("should show country flags", async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/🇩🇪/)).toBeInTheDocument();
      });

      expect(screen.getByText(/🇬🇧/)).toBeInTheDocument();
      expect(screen.getByText(/🇺🇸/)).toBeInTheDocument();
    });

    it("should highlight selected country with orange border", async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/Germany/)).toBeInTheDocument();
      });

      const germanyButton = screen.getByRole("button", { name: /Germany/i });
      fireEvent.click(germanyButton);

      await waitFor(() => {
        expect(germanyButton).toHaveClass("border-orange-500");
      });
    });

    it("should require country selection before proceeding", async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/Germany/)).toBeInTheDocument();
      });

      const nextButton = screen.getByRole("button", { name: /Continue/i });
      expect(nextButton).toBeDisabled();

      const germanyButton = screen.getByRole("button", { name: /Germany/i });
      fireEvent.click(germanyButton);

      expect(nextButton).not.toBeDisabled();
    });
  });

  describe("Size Preference Step", () => {
    it("should show size options after country selection", async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/Germany/)).toBeInTheDocument();
      });

      const germanyButton = screen.getByRole("button", { name: /Germany/i });
      fireEvent.click(germanyButton);

      const continueButton = screen.getByRole("button", { name: /Continue/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Size preference/i)).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: /Small/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Medium/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Large/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Giant/i }),
      ).toBeInTheDocument();
    });

    it("should show size icons", async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/Germany/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Germany/i }));
      fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

      await waitFor(() => {
        const dogEmojis = screen.getAllByText(/🐕/);
        expect(dogEmojis.length).toBeGreaterThan(0);
      });
    });

    it("should allow multiple size selection", async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/Germany/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Germany/i }));
      fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Size preference/i)).toBeInTheDocument();
      });

      const smallButton = screen.getByRole("button", { name: /Small/i });
      const mediumButton = screen.getByRole("button", { name: /Medium/i });

      fireEvent.click(smallButton);
      fireEvent.click(mediumButton);

      expect(smallButton).toHaveClass("border-orange-500");
      expect(mediumButton).toHaveClass("border-orange-500");
    });

    it("should allow skipping size selection", async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/Germany/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Germany/i }));
      fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

      await waitFor(() => {
        const skipButton = screen.getByRole("button", {
          name: /Skip|All sizes/i,
        });
        expect(skipButton).toBeInTheDocument();
      });
    });
  });

  describe("Completion", () => {
    it("should save filters and mark onboarding complete", async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/Germany/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Germany/i }));
      fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Size preference/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Small/i }));
      fireEvent.click(screen.getByRole("button", { name: /Medium/i }));

      fireEvent.click(screen.getByRole("button", { name: /Start Browsing/i }));

      await waitFor(() => {
        expect(localStorage.getItem("swipeOnboardingComplete")).toBe("true");
        expect(
          JSON.parse(localStorage.getItem("swipeFilters") || "{}"),
        ).toEqual({
          country: "DE",
          sizes: ["small", "medium"],
          ages: [],
        });
      });
    });

    it("should call onComplete with filters", async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/Germany/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Germany/i }));
      fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Size preference/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Small/i }));
      fireEvent.click(screen.getByRole("button", { name: /Start Browsing/i }));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(false, {
          country: "DE",
          sizes: ["small"],
          ages: [],
        });
      });
    });
  });

  describe("Visual Design", () => {
    it("should show paw print icon for country step", () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      expect(screen.getByTestId("paw-print-icon")).toBeInTheDocument();
    });

    it("should show descriptive text", () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      expect(
        screen.getByText(/We'll show dogs available in your country/i),
      ).toBeInTheDocument();
    });

    it("should use framer motion for step transitions", async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/Germany/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Germany/i }));
      fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Size preference/i)).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      expect(screen.getByRole("dialog")).toHaveAttribute(
        "aria-label",
        "Swipe feature onboarding",
      );
    });

    it("should be keyboard navigable", async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/Germany/)).toBeInTheDocument();
      });

      const germanyButton = screen.getByRole("button", { name: /Germany/i });
      germanyButton.focus();

      fireEvent.keyDown(germanyButton, { key: "Enter" });
      expect(germanyButton).toHaveClass("border-orange-500");
    });

    it("should have step progress accessible to screen readers", async () => {
      render(<SwipeOnboarding onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/Germany/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Germany/i }));
      fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

      await waitFor(() => {
        const announcement = screen.getByRole("status");
        expect(announcement).toHaveAttribute("aria-label", "Step 2 of 2");
      });
    });
  });
});
