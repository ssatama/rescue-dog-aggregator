import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SwipeContainer } from "../SwipeContainer";
import { useFavorites } from "../../../hooks/useFavorites";
import useSwipeFilters from "../../../hooks/useSwipeFilters";
import type { Dog } from "@/types/dog";

jest.mock("../../../hooks/useFavorites");
jest.mock("../../../hooks/useSwipeFilters");
jest.mock("@sentry/nextjs", () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));
jest.mock("../SwipeCard", () => ({
  SwipeCard: ({ dog }: { dog: Dog }) => <div data-testid="swipe-card">{dog.name}</div>,
}));
jest.mock("../SwipeOnboarding", () => function SwipeOnboarding() {
  return null;
});
jest.mock("../SwipeFilters", () => function SwipeFilters() {
  return <div data-testid="filter-pills" />;
});
jest.mock("../FilterModal", () => ({
  FilterModal: ({ show }: { show: boolean }) => (show ? <div role="dialog" aria-label="Filter dogs" /> : null),
}));

const dogs: Dog[] = [1, 2, 3].map((id) => ({ id, name: `Dog ${id}` }));
const mockToggleFavorite = jest.fn();

function renderStack(props: Partial<React.ComponentProps<typeof SwipeContainer>> = {}) {
  return render(
    <SwipeContainer initialDogs={dogs} fetchDogs={jest.fn(() => Promise.resolve([]))} {...props} />,
  );
}

const current = () => screen.getByTestId("swipe-card").textContent;

describe("SwipeContainer (#499)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (useFavorites as jest.Mock).mockReturnValue({ toggleFavorite: mockToggleFavorite });
    (useSwipeFilters as jest.Mock).mockReturnValue({
      filters: { country: "UK", sizes: [], ages: [] },
      setFilters: jest.fn(),
      // No refetch: the stack stays the initial dogs
      isValid: false,
      toQueryString: () => "",
      needsOnboarding: false,
      completeOnboarding: jest.fn(),
    });
  });

  it("labels the controls Back and Next and shows no counter", () => {
    renderStack();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    expect(screen.queryByText(/of 3/)).not.toBeInTheDocument();
  });

  it("browses, saves and opens details from the keyboard", () => {
    const onCardExpanded = jest.fn();
    renderStack({ onCardExpanded });

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(current()).toBe("Dog 2");
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(current()).toBe("Dog 1");

    fireEvent.keyDown(window, { key: "f" });
    expect(mockToggleFavorite).toHaveBeenCalledWith(1, "Dog 1", dogs[0]);

    fireEvent.keyDown(window, { key: "Enter" });
    expect(onCardExpanded).toHaveBeenCalledWith(dogs[0], 0);
  });

  it("leaves Enter on a focused button to that button", () => {
    const onCardExpanded = jest.fn();
    renderStack({ onCardExpanded });
    const next = screen.getByRole("button", { name: "Next" });
    fireEvent.keyDown(next, { key: "Enter" });
    expect(onCardExpanded).not.toHaveBeenCalled();
  });

  it("ignores the keys while the details are open or a modifier is held", () => {
    const { rerender } = renderStack({ keyboardEnabled: false });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(current()).toBe("Dog 1");

    rerender(<SwipeContainer initialDogs={dogs} fetchDogs={jest.fn(() => Promise.resolve([]))} />);
    fireEvent.keyDown(window, { key: "ArrowRight", metaKey: true });
    expect(current()).toBe("Dog 1");
  });

  it("ends the stack with a friendly state instead of a disabled Next", async () => {
    renderStack();
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Next" }));
      });
    }
    expect(screen.getByRole("heading", { name: "You've seen every dog here" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start over" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse all dogs" })).toHaveAttribute("href", "/dogs");

    fireEvent.click(screen.getByRole("button", { name: "Change filters" }));
    expect(screen.getByRole("dialog", { name: "Filter dogs" })).toBeInTheDocument();
  });

  it("says so when no dogs match at all", () => {
    render(<SwipeContainer initialDogs={[]} fetchDogs={jest.fn(() => Promise.resolve([]))} />);
    expect(screen.getByRole("heading", { name: "No dogs match these filters" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start over" })).not.toBeInTheDocument();
  });

  describe("with a live stack", () => {
    const validFilters = {
      filters: { country: "UK", sizes: [], ages: [] },
      setFilters: jest.fn(),
      isValid: true,
      toQueryString: () => "adoptable_to_country=UK",
      needsOnboarding: false,
      completeOnboarding: jest.fn(),
    };

    beforeEach(() => {
      (useSwipeFilters as jest.Mock).mockReturnValue(validFilters);
    });

    it("loads more as the end nears and drops dogs already in the stack", async () => {
      const fetchDogs = jest
        .fn()
        .mockResolvedValue([])
        .mockResolvedValueOnce(dogs)
        .mockResolvedValueOnce([dogs[2], { id: 4, name: "Dog 4" }]);
      render(<SwipeContainer initialDogs={dogs} fetchDogs={fetchDogs} />);
      await screen.findByText("Dog 1");

      await act(async () => {
        fireEvent.keyDown(window, { key: "ArrowRight" });
      });
      expect(fetchDogs).toHaveBeenLastCalledWith("adoptable_to_country=UK&offset=3&randomize=true");

      for (const name of ["Dog 3", "Dog 4"]) {
        await act(async () => {
          fireEvent.keyDown(window, { key: "ArrowRight" });
        });
        expect(current()).toBe(name);
      }
      await act(async () => {
        fireEvent.keyDown(window, { key: "ArrowRight" });
      });
      expect(screen.getByTestId("swipe-end")).toBeInTheDocument();
    });

    it("goes back from the end to the last dog", async () => {
      const fetchDogs = jest.fn().mockResolvedValue(dogs);
      render(<SwipeContainer initialDogs={dogs} fetchDogs={fetchDogs} />);
      await screen.findByText("Dog 1");
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          fireEvent.keyDown(window, { key: "ArrowRight" });
        });
      }
      expect(screen.getByTestId("swipe-end")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "ArrowLeft" });
      expect(current()).toBe("Dog 3");
    });

    it("Start over reshuffles from the first dog", async () => {
      const fetchDogs = jest.fn().mockResolvedValue(dogs);
      render(<SwipeContainer initialDogs={dogs} fetchDogs={fetchDogs} />);
      await screen.findByText("Dog 1");
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          fireEvent.keyDown(window, { key: "ArrowRight" });
        });
      }

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Start over" }));
      });
      expect(fetchDogs).toHaveBeenLastCalledWith("adoptable_to_country=UK&randomize=true");
      expect(current()).toBe("Dog 1");
      expect(localStorage.getItem("swipeCurrentIndex")).toBe("0");
    });

    it("starts new filters at the first dog, even from the end screen", async () => {
      const fetchDogs = jest.fn().mockResolvedValue(dogs);
      const { rerender } = render(<SwipeContainer initialDogs={dogs} fetchDogs={fetchDogs} />);
      await screen.findByText("Dog 1");
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          fireEvent.keyDown(window, { key: "ArrowRight" });
        });
      }
      expect(screen.getByTestId("swipe-end")).toBeInTheDocument();

      (useSwipeFilters as jest.Mock).mockReturnValue({ ...validFilters, toQueryString: () => "adoptable_to_country=DE" });
      await act(async () => {
        rerender(<SwipeContainer initialDogs={dogs} fetchDogs={fetchDogs} />);
      });
      expect(current()).toBe("Dog 1");
    });

    it("keeps the stack when a request fails instead of saying nothing matches", async () => {
      const fetchDogs = jest.fn().mockResolvedValueOnce(dogs).mockRejectedValue(new Error("down"));
      render(<SwipeContainer initialDogs={dogs} fetchDogs={fetchDogs} />);
      await screen.findByText("Dog 1");
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          fireEvent.keyDown(window, { key: "ArrowRight" });
        });
      }
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Start over" }));
      });
      expect(current()).toBe("Dog 1");
      expect(screen.queryByText("No dogs match these filters")).not.toBeInTheDocument();
    });

    it("offers to retry when the first load fails", async () => {
      const fetchDogs = jest.fn().mockRejectedValue(new Error("down"));
      await act(async () => {
        render(<SwipeContainer initialDogs={[]} fetchDogs={fetchDogs} />);
      });
      expect(screen.getByRole("heading", { name: "We couldn't load the dogs" })).toBeInTheDocument();
      expect(screen.queryByText("No dogs match these filters")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    });
  });
});
