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
});
