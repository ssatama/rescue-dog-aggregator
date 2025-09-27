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

jest.mock("../../../components/swipe/SwipeContainerWithFilters", () => ({
  SwipeContainerWithFilters: () => <div>Swipe Container</div>,
}));

jest.mock("../../../components/swipe/SwipeDetails", () => ({
  SwipeDetails: () => <div>Swipe Details</div>,
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

  it("should show desktop message for non-swipe devices", () => {
    mockUseSwipeDevice.mockReturnValue(false);

    render(<SwipePage />);
    expect(screen.getByText("Mobile Only Feature")).toBeInTheDocument();
    expect(
      screen.getByText(/The swipe feature is designed for mobile devices/),
    ).toBeInTheDocument();
  });

  it("should have a button to go back to homepage on desktop", () => {
    mockUseSwipeDevice.mockReturnValue(false);

    render(<SwipePage />);
    const backButton = screen.getByText("Back to Homepage");
    expect(backButton).toBeInTheDocument();
    backButton.click();
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
