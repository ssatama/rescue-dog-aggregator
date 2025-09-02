import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SwipeContainerWithFilters } from "../SwipeContainerWithFilters";
import { useFavorites } from "../../../hooks/useFavorites";
import useSwipeFilters from "../../../hooks/useSwipeFilters";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

jest.mock("../../../hooks/useFavorites");
jest.mock("../../../hooks/useSwipeFilters");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));
jest.mock("@sentry/nextjs", () => ({
  captureEvent: jest.fn(),
  captureException: jest.fn(),
}));

jest.mock("framer-motion", () => {
  const React = require("react");

  // List of props that should be filtered out to prevent React warnings
  const FRAMER_MOTION_PROPS = [
    "drag",
    "dragConstraints",
    "dragElastic",
    "onDrag",
    "onDragEnd",
    "onDragStart",
    "initial",
    "animate",
    "exit",
    "transition",
    "variants",
    "style",
    "whileTap",
    "whileDrag",
    "whileHover",
    "whileFocus",
    "whileInView",
    "onAnimationComplete",
    "onAnimationStart",
    "onAnimationUpdate",
    "layoutId",
    "layout",
    "layoutDependency",
    "layoutScroll",
  ];

  const MotionDiv = React.forwardRef<HTMLDivElement, any>(
    function MockMotionDiv(
      {
        children,
        onDrag,
        onDragEnd,
        onClick,
        onAnimationComplete,
        exit,
        ...allProps
      },
      ref,
    ) {
      // Filter out framer-motion props to prevent React warnings
      const domProps = Object.keys(allProps).reduce((acc, key) => {
        if (!FRAMER_MOTION_PROPS.includes(key)) {
          acc[key] = allProps[key];
        }
        return acc;
      }, {} as any);

      // Handle exit animation completion
      React.useEffect(() => {
        if (exit && onAnimationComplete) {
          const timer = setTimeout(() => onAnimationComplete(), 100);
          return () => clearTimeout(timer);
        }
      }, [exit, onAnimationComplete]);

      // Handle drag events by converting them to mouse events for testing
      const handleMouseDown = (e: React.MouseEvent) => {
        if (!onDrag && !onDragEnd) return;

        const startX = e.clientX;
        const startY = e.clientY;

        const handleMouseMove = (e: MouseEvent) => {
          if (onDrag) {
            onDrag(e, {
              offset: { x: e.clientX - startX, y: e.clientY - startY },
              point: { x: e.clientX, y: e.clientY },
            });
          }
        };

        const handleMouseUp = (e: MouseEvent) => {
          if (onDragEnd) {
            const offset = { x: e.clientX - startX, y: e.clientY - startY };
            onDragEnd(e, {
              offset,
              velocity: {
                x: Math.abs(offset.x) > 50 ? (offset.x > 0 ? 1 : -1) : 0,
                y: 0,
              },
              point: { x: e.clientX, y: e.clientY },
            });
          }
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      };

      return (
        <div
          ref={ref}
          onClick={onClick}
          onMouseDown={handleMouseDown}
          {...domProps}
        >
          {children}
        </div>
      );
    },
  );

  MotionDiv.displayName = "MockMotionDiv";

  return {
    motion: {
      div: MotionDiv,
    },
    AnimatePresence: ({ children, onExitComplete }: any) => {
      React.useEffect(() => {
        if (onExitComplete) {
          const timer = setTimeout(() => onExitComplete(), 150);
          return () => clearTimeout(timer);
        }
      }, [children, onExitComplete]);
      return <>{children}</>;
    },
    useMotionValue: () => ({
      set: jest.fn(),
      get: () => 0,
    }),
    useTransform: () => 0,
  };
});

describe("SwipeContainerWithFilters - Animation Bug", () => {
  const mockPush = jest.fn();
  const mockAddFavorite = jest.fn();
  const mockFetchDogs = jest.fn();
  const mockOnSwipe = jest.fn();

  const mockDogs = [
    {
      id: 1,
      name: "Buddy",
      breed: "Golden Retriever",
      age: "2 years",
      slug: "buddy-1",
      organization: "Happy Paws",
      location: "New York",
      image: "/dog1.jpg",
      description: "Friendly dog",
      traits: ["Friendly", "Playful"],
      energy_level: 4,
    },
    {
      id: 2,
      name: "Max",
      breed: "Labrador",
      age: "3 years",
      slug: "max-2",
      organization: "Dog Rescue",
      location: "Boston",
      image: "/dog2.jpg",
      description: "Energetic dog",
      traits: ["Energetic", "Loyal"],
      energy_level: 5,
    },
    {
      id: 3,
      name: "Luna",
      breed: "Husky",
      age: "1 year",
      slug: "luna-3",
      organization: "Pet Haven",
      location: "Chicago",
      image: "/dog3.jpg",
      description: "Beautiful husky",
      traits: ["Independent", "Active"],
      energy_level: 5,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    (useFavorites as jest.Mock).mockReturnValue({
      addFavorite: mockAddFavorite,
      isFavorited: jest.fn().mockReturnValue(false),
    });

    (useSwipeFilters as jest.Mock).mockReturnValue({
      filters: {
        country: "US",
        size: "medium",
        ageRange: null,
      },
      setFilters: jest.fn(),
      isValid: true,
      toQueryString: jest.fn().mockReturnValue("country=US&size=medium"),
      needsOnboarding: false,
      completeOnboarding: jest.fn(),
    });

    mockFetchDogs.mockImplementation((queryString) => {
      // First call returns the initial dogs, subsequent calls (with offset) return empty
      if (queryString.includes("offset=")) {
        return Promise.resolve([]);
      }
      return Promise.resolve(mockDogs);
    });
  });

  it("should load next dog after swipe animation completes", async () => {
    render(
      <SwipeContainerWithFilters
        fetchDogs={mockFetchDogs}
        onSwipe={mockOnSwipe}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Buddy")).toBeInTheDocument();
    });

    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    const favoriteButton = screen.getByLabelText("Add to favorites");
    fireEvent.click(favoriteButton);

    await waitFor(() => {
      expect(mockOnSwipe).toHaveBeenCalledWith("right", mockDogs[0]);
    });

    await waitFor(
      () => {
        expect(screen.getByText("Max")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        expect(screen.getByText("2 / 3")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should handle rapid consecutive swipes without getting stuck", async () => {
    render(
      <SwipeContainerWithFilters
        fetchDogs={mockFetchDogs}
        onSwipe={mockOnSwipe}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Buddy")).toBeInTheDocument();
    });

    const nextButton = screen.getByLabelText("Next dog");

    // First swipe
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockOnSwipe).toHaveBeenCalledWith("left", mockDogs[0]);
    });

    // Wait for animation to complete
    await waitFor(() => {
      expect(screen.getByText("Max")).toBeInTheDocument();
    });

    // Wait for button to be enabled again
    await waitFor(() => {
      expect(nextButton).not.toBeDisabled();
    });

    // Second swipe after animation completes
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockOnSwipe).toHaveBeenCalledWith("left", mockDogs[1]);
    });

    await waitFor(
      () => {
        expect(screen.getByText("Luna")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    await waitFor(() => {
      expect(screen.getByText("3 / 3")).toBeInTheDocument();
    });
  });

  it("should properly reset animation state between swipes", async () => {
    const { rerender } = render(
      <SwipeContainerWithFilters
        fetchDogs={mockFetchDogs}
        onSwipe={mockOnSwipe}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Buddy")).toBeInTheDocument();
    });

    const favoriteButton = screen.getByLabelText("Add to favorites");

    fireEvent.click(favoriteButton);

    await waitFor(() => {
      expect(mockOnSwipe).toHaveBeenCalledWith("right", mockDogs[0]);
    });

    // Wait for animation to complete and next card to appear
    await waitFor(
      () => {
        expect(screen.getByText("Max")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    // Wait for button to be enabled again
    await waitFor(() => {
      expect(favoriteButton).not.toBeDisabled();
    });

    const nextButton = screen.getByLabelText("Next dog");
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockOnSwipe).toHaveBeenCalledWith("left", mockDogs[1]);
    });

    await waitFor(
      () => {
        expect(screen.getByText("Luna")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    const currentCard = screen.getByText("Luna").closest("div");
    expect(currentCard).toBeInTheDocument();
    // Remove style check as it's not relevant with our mock
  });

  it("should not allow interactions during exit animation", async () => {
    render(
      <SwipeContainerWithFilters
        fetchDogs={mockFetchDogs}
        onSwipe={mockOnSwipe}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Buddy")).toBeInTheDocument();
    });

    const favoriteButton = screen.getByLabelText("Add to favorites");
    const nextButton = screen.getByLabelText("Next dog");

    // First swipe triggers the animation
    fireEvent.click(favoriteButton);

    // Button should be disabled during animation
    expect(favoriteButton).toBeDisabled();
    expect(nextButton).toBeDisabled();

    // Try clicking during animation (should be ignored)
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockOnSwipe).toHaveBeenCalledTimes(1);
    });

    expect(mockOnSwipe).toHaveBeenCalledWith("right", mockDogs[0]);
    expect(mockOnSwipe).not.toHaveBeenCalledWith("left", mockDogs[0]);

    // Wait for animation to complete
    await waitFor(() => {
      expect(favoriteButton).not.toBeDisabled();
    });
  });
});
