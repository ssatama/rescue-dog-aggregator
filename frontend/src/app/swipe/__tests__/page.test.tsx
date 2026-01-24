import React from "react";
import { render, screen } from "@testing-library/react";
import SwipePage from "../page";
import { useRouter } from "next/navigation";
import { useSwipeDevice } from "../../../hooks/useSwipeDevice";

// Mock next/dynamic to render mocked components synchronously
jest.mock("next/dynamic", () => {
  return jest.fn((importFn: () => Promise<unknown>) => {
    // Extract the import path from the function to determine which mock to use
    const fnString = importFn.toString();

    // Match component based on import path in the function string
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

    // Default: return null for unknown components
    return function UnknownDynamicComponent() {
      return null;
    };
  });
});

// Mock the modules
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
  default: () => <div data-testid="dog-detail-modal-skeleton">Loading modal...</div>,
}));

describe("SwipePage", () => {
  const mockPush = jest.fn();
  const mockUseSwipeDevice = useSwipeDevice as jest.Mock;
  const mockUseRouter = useRouter as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush });
  });

  it("should show swipe container for mobile devices", () => {
    mockUseSwipeDevice.mockReturnValue(true);

    render(<SwipePage />);
    expect(screen.getByText("Swipe Container")).toBeInTheDocument();
  });

  it("should show swipe container for tablets (768px-1279px)", () => {
    // Simulating an iPad
    mockUseSwipeDevice.mockReturnValue(true);

    render(<SwipePage />);
    expect(screen.getByText("Swipe Container")).toBeInTheDocument();
  });

  it("should show swipe container for touch-capable devices", () => {
    mockUseSwipeDevice.mockReturnValue(true);

    render(<SwipePage />);
    expect(screen.getByText("Swipe Container")).toBeInTheDocument();
  });

  it("should show swipe container for all devices", () => {
    // Simulating an iPad
    mockUseSwipeDevice.mockReturnValue(true);

    render(<SwipePage />);
    expect(screen.getByText("Swipe Container")).toBeInTheDocument();
  });

  it("should show swipe container even on desktop devices", () => {
    (useSwipeDevice as jest.Mock).mockReturnValue(false);

    render(<SwipePage />);
    // Desktop users should now see the swipe container, not the blocking message
    expect(screen.getByText("Swipe Container")).toBeInTheDocument();
    expect(screen.queryByText("Mobile Only Feature")).not.toBeInTheDocument();
  });
});
