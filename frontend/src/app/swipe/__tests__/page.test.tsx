import React from "react";
import { render, screen } from "@testing-library/react";
import SwipePageClient from "../SwipePageClient";
import { useRouter } from "next/navigation";
import { useSwipeDevice } from "../../../hooks/useSwipeDevice";

jest.mock("next/dynamic", () => {
  return jest.fn((importFn: () => Promise<unknown>) => {
    const fnString = importFn.toString();

    if (fnString.includes("SwipeContainer")) {
      return function MockedSwipeContainer(props: Record<string, unknown>) {
        const { SwipeContainer } =
          jest.requireMock<{ SwipeContainer: React.ComponentType<unknown> }>(
            "../../../components/swipe/SwipeContainer",
          );
        return React.createElement(SwipeContainer, props);
      };
    }

    if (fnString.includes("DogDetailModalUpgraded")) {
      return function MockedDogDetailModal(props: Record<string, unknown>) {
        const mod = jest.requireMock<{ default: React.ComponentType<unknown> }>(
          "../../../components/dogs/mobile/detail/DogDetailModalUpgraded",
        );
        return React.createElement(mod.default, props);
      };
    }

    return function UnknownDynamicComponent() {
      return null;
    };
  });
});

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("../../../hooks/useSwipeDevice", () => ({
  useSwipeDevice: jest.fn(),
}));

jest.mock("../../../hooks/useMediaQuery", () => ({
  useMediaQuery: jest.fn(),
}));

jest.mock("../../../components/swipe/SwipeErrorBoundary", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("../../../utils/swipeMetrics", () => ({
  swipeMetrics: {
    trackLoadTime: jest.fn(),
    startFPSMonitoring: jest.fn(),
    stopFPSMonitoring: jest.fn(),
    checkFPSHealth: jest.fn(),
    trackSwipe: jest.fn(),
    trackQueueExhausted: jest.fn(),
    trackFavoriteAdded: jest.fn(),
  },
}));

jest.mock("@sentry/nextjs", () => ({
  captureEvent: jest.fn(),
}));

jest.mock("../../../components/swipe/SwipeContainer", () => ({
  __esModule: true,
  SwipeContainer: () => <div>Swipe Container</div>,
}));

jest.mock(
  "../../../components/dogs/mobile/detail/DogDetailModalUpgraded",
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

jest.mock("../../../components/ui/SwipeContainerSkeleton", () => ({
  __esModule: true,
  default: () => <div>Loading...</div>,
}));

jest.mock("../../../components/ui/DogDetailModalSkeleton", () => ({
  __esModule: true,
  default: () => (
    <div data-testid="dog-detail-modal-skeleton">Loading modal...</div>
  ),
}));

const defaultProps = {
  initialDogs: null,
  initialFilters: { country: "", sizes: [], ages: [] },
  hasUrlFilters: false,
  availableCountries: [
    { value: "GB", label: "United Kingdom", flag: "\u{1F1EC}\u{1F1E7}", count: 100 },
  ],
};

describe("SwipePageClient", () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  const mockUseSwipeDevice = useSwipeDevice as jest.Mock;
  const mockUseRouter = useRouter as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush, replace: mockReplace });
  });

  it("should show swipe container for mobile devices", () => {
    mockUseSwipeDevice.mockReturnValue(true);

    render(<SwipePageClient {...defaultProps} />);
    expect(screen.getByText("Swipe Container")).toBeInTheDocument();
  });

  it("should show swipe container for tablets (768px-1279px)", () => {
    mockUseSwipeDevice.mockReturnValue(true);

    render(<SwipePageClient {...defaultProps} />);
    expect(screen.getByText("Swipe Container")).toBeInTheDocument();
  });

  it("should show swipe container for touch-capable devices", () => {
    mockUseSwipeDevice.mockReturnValue(true);

    render(<SwipePageClient {...defaultProps} />);
    expect(screen.getByText("Swipe Container")).toBeInTheDocument();
  });

  it("should show swipe container for all devices", () => {
    mockUseSwipeDevice.mockReturnValue(true);

    render(<SwipePageClient {...defaultProps} />);
    expect(screen.getByText("Swipe Container")).toBeInTheDocument();
  });

  it("should show swipe container even on desktop devices", () => {
    mockUseSwipeDevice.mockReturnValue(false);

    render(<SwipePageClient {...defaultProps} />);
    expect(screen.getByText("Swipe Container")).toBeInTheDocument();
    expect(screen.queryByText("Mobile Only Feature")).not.toBeInTheDocument();
  });

  it("should pass initialDogs to SwipeContainer when provided", () => {
    mockUseSwipeDevice.mockReturnValue(true);

    const propsWithDogs = {
      ...defaultProps,
      initialDogs: [{ id: 1, name: "Buddy" }],
      hasUrlFilters: true,
      initialFilters: { country: "GB", sizes: [], ages: [] },
    };

    render(<SwipePageClient {...propsWithDogs} />);
    expect(screen.getByText("Swipe Container")).toBeInTheDocument();
  });

  it("should pass hasUrlFilters false when no URL params", () => {
    mockUseSwipeDevice.mockReturnValue(true);

    render(<SwipePageClient {...defaultProps} hasUrlFilters={false} />);
    expect(screen.getByText("Swipe Container")).toBeInTheDocument();
  });

  describe("localStorage migration", () => {
    beforeEach(() => {
      localStorage.clear();
      jest.clearAllMocks();
      mockUseSwipeDevice.mockReturnValue(true);
    });

    it("should migrate localStorage filters to URL on first visit", () => {
      localStorage.setItem(
        "swipeFilters",
        JSON.stringify({ country: "GB", sizes: ["small"], ages: [] }),
      );

      render(<SwipePageClient {...defaultProps} hasUrlFilters={false} />);

      expect(mockReplace).toHaveBeenCalledWith("/swipe?country=GB&size=small");
    });

    it("should NOT migrate when URL already has filters", () => {
      localStorage.setItem(
        "swipeFilters",
        JSON.stringify({ country: "DE", sizes: [], ages: [] }),
      );

      render(
        <SwipePageClient
          {...defaultProps}
          hasUrlFilters={true}
          initialFilters={{ country: "GB", sizes: [], ages: [] }}
        />,
      );

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("should not migrate when localStorage has no country", () => {
      localStorage.setItem(
        "swipeFilters",
        JSON.stringify({ country: "", sizes: [], ages: [] }),
      );

      render(<SwipePageClient {...defaultProps} hasUrlFilters={false} />);

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("should not migrate when localStorage is empty", () => {
      render(<SwipePageClient {...defaultProps} hasUrlFilters={false} />);

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("should include multiple sizes in migration URL", () => {
      localStorage.setItem(
        "swipeFilters",
        JSON.stringify({ country: "FR", sizes: ["small", "medium"], ages: ["puppy"] }),
      );

      render(<SwipePageClient {...defaultProps} hasUrlFilters={false} />);

      expect(mockReplace).toHaveBeenCalledWith(
        "/swipe?country=FR&size=small&size=medium&age=puppy",
      );
    });
  });
});
