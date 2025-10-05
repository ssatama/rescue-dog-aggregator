import { render, screen, waitFor } from "../../../test-utils";
import StatsDisplay from "../StatsDisplay";
import { getStatistics } from "../../../services/animalsService";

jest.mock("../../../services/animalsService");

// Mock IntersectionObserver
let intersectionCallback;
const mockIntersectionObserver = jest.fn((callback) => {
  intersectionCallback = callback;
  return {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  };
});
window.IntersectionObserver = mockIntersectionObserver;

describe("StatsDisplay", () => {
  test("fetches and displays stats", async () => {
    getStatistics.mockResolvedValue({
      total_dogs: 3246,
      total_organizations: 13,
      total_countries: 13,
    });

    render(<StatsDisplay />);

    await waitFor(() => {
      const counters = screen.getAllByTestId("animated-counter");
      expect(counters).toHaveLength(3);
      expect(screen.getByText(/Dogs/)).toBeInTheDocument();
      expect(screen.getByText(/Organizations/)).toBeInTheDocument();
      expect(screen.getByText(/Countries/)).toBeInTheDocument();
    });
  });

  test("shows loading state", () => {
    getStatistics.mockReturnValue(new Promise(() => {}));
    render(<StatsDisplay />);
    expect(screen.getByTestId("stats-loading")).toBeInTheDocument();
  });

  test("handles error gracefully", async () => {
    getStatistics.mockRejectedValue(new Error("API Error"));
    render(<StatsDisplay />);
    await waitFor(() => {
      expect(screen.getByText(/unable to load/i)).toBeInTheDocument();
    });
  });

  test("has orange gradient background", async () => {
    getStatistics.mockResolvedValue({
      total_dogs: 3246,
      total_organizations: 13,
      total_countries: 13,
    });

    const { container } = render(<StatsDisplay />);

    await waitFor(() => {
      const gradient = container.querySelector(
        ".bg-gradient-to-br.from-orange-50",
      );
      expect(gradient).toBeInTheDocument();
      expect(gradient.className).toContain("rounded-2xl");
      expect(gradient.className).toContain("shadow-lg");
    });
  });

  test("has grid pattern overlay", async () => {
    getStatistics.mockResolvedValue({
      total_dogs: 3246,
      total_organizations: 13,
      total_countries: 13,
    });

    const { container } = render(<StatsDisplay />);

    await waitFor(() => {
      // Check for the grid pattern div by its other classes
      const gridPattern = container.querySelector(".absolute.inset-0");
      expect(gridPattern).toBeInTheDocument();
      // Verify it has the grid background class (even if complex)
      expect(gridPattern.className).toContain("bg-[linear-gradient");
    });
  });

  test("numbers have gradient text effect", async () => {
    getStatistics.mockResolvedValue({
      total_dogs: 3246,
      total_organizations: 13,
      total_countries: 13,
    });

    const { container } = render(<StatsDisplay />);

    await waitFor(() => {
      const gradientTexts = container.querySelectorAll(
        ".bg-gradient-to-br.from-orange-600",
      );
      expect(gradientTexts.length).toBe(3);

      gradientTexts.forEach((el) => {
        expect(el.className).toContain("bg-clip-text");
        expect(el.className).toContain("text-transparent");
        expect(el.className).toContain("text-6xl");
      });
    });
  });

  test("displays green 'Updated Daily' badge with pulse", async () => {
    getStatistics.mockResolvedValue({
      total_dogs: 3246,
      total_organizations: 13,
      total_countries: 13,
    });

    const { container } = render(<StatsDisplay />);

    await waitFor(() => {
      expect(screen.getByText("Updated Daily")).toBeInTheDocument();

      const badge = container.querySelector(".bg-green-100");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain("rounded-full");

      const pulseIndicator = container.querySelector(
        ".animate-pulse.bg-green-500",
      );
      expect(pulseIndicator).toBeInTheDocument();
    });
  });

  test("stat numbers have large font sizes", async () => {
    getStatistics.mockResolvedValue({
      total_dogs: 3246,
      total_organizations: 13,
      total_countries: 13,
    });

    const { container } = render(<StatsDisplay />);

    await waitFor(() => {
      const numbers = container.querySelectorAll(
        ".text-5xl.sm\\:text-6xl.lg\\:text-7xl",
      );
      expect(numbers.length).toBe(3);
    });
  });
});
