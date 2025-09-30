import React from "react";
import { render, screen } from "@testing-library/react";
import SwipePage from "../page";
import { useRouter } from "next/navigation";
import { useSwipeDevice } from "../../../hooks/useSwipeDevice";

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
  SwipeContainer: () => <div>Swipe Container</div>,
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
