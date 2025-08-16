import React from "react";
import { render, screen, waitFor } from "../../../test-utils";
import userEvent from "@testing-library/user-event";
import HeroImageWithBlurredBackground, {
  HeroImageWithBlurredBackgroundProps,
} from "../HeroImageWithBlurredBackground";

// Mock the hooks
jest.mock("../../../hooks/useAdvancedImage", () => ({
  useAdvancedImage: jest.fn(() => ({
    imageLoaded: false,
    hasError: false,
    isLoading: true,
    isRetrying: false,
    retryCount: 0,
    currentSrc: "https://example.com/test.jpg",
    position: "center",
    networkStrategy: { loading: "eager", retry: { maxRetries: 2 } },
    handleRetry: jest.fn(),
  })),
}));

jest.mock("../../../hooks/useScrollAnimation", () => ({
  useReducedMotion: jest.fn(() => false),
}));

describe("HeroImageWithBlurredBackground TypeScript Tests", () => {
  const defaultProps: HeroImageWithBlurredBackgroundProps = {
    src: "https://example.com/test.jpg",
    alt: "Test image",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset to default mock implementation
    const { useAdvancedImage } = require("../../../hooks/useAdvancedImage");
    useAdvancedImage.mockImplementation(() => ({
      imageLoaded: false,
      hasError: false,
      isLoading: true,
      isRetrying: false,
      retryCount: 0,
      currentSrc: "https://example.com/test.jpg",
      position: "center",
      networkStrategy: { loading: "eager", retry: { maxRetries: 2 } },
      handleRetry: jest.fn(),
    }));
  });

  test("accepts required props with proper types", () => {
    render(<HeroImageWithBlurredBackground {...defaultProps} />);

    expect(screen.getByTestId("hero-image-clean")).toBeInTheDocument();
    expect(screen.getByTestId("hero-image")).toHaveAttribute(
      "alt",
      "Test image",
    );
  });

  test("accepts optional className prop", () => {
    const className = "custom-hero-class";

    render(
      <HeroImageWithBlurredBackground
        {...defaultProps}
        className={className}
      />,
    );

    const container = screen.getByTestId("hero-image-clean");
    expect(container).toHaveClass(className);
  });

  test("accepts optional onError callback", () => {
    const onError = jest.fn();

    render(
      <HeroImageWithBlurredBackground {...defaultProps} onError={onError} />,
    );

    expect(screen.getByTestId("hero-image-clean")).toBeInTheDocument();
  });

  test("accepts optional useGradientFallback prop", () => {
    const useGradientFallback = true;

    render(
      <HeroImageWithBlurredBackground
        {...defaultProps}
        useGradientFallback={useGradientFallback}
      />,
    );

    expect(screen.getByTestId("hero-image-clean")).toBeInTheDocument();
  });

  test("properly types all props together", () => {
    const props: HeroImageWithBlurredBackgroundProps = {
      src: "https://example.com/test.jpg",
      alt: "Test image",
      className: "custom-class",
      onError: jest.fn(),
      useGradientFallback: true,
    };

    render(<HeroImageWithBlurredBackground {...props} />);

    expect(screen.getByTestId("hero-image-clean")).toBeInTheDocument();
    expect(screen.getByTestId("hero-image")).toHaveAttribute(
      "alt",
      "Test image",
    );
  });

  test("handles loading state with proper TypeScript types", () => {
    const { useAdvancedImage } = require("../../../hooks/useAdvancedImage");

    useAdvancedImage.mockImplementation(() => ({
      imageLoaded: false,
      hasError: false,
      isLoading: true,
      isRetrying: false,
      retryCount: 0,
      currentSrc: "https://example.com/test.jpg",
      position: "center",
      networkStrategy: { loading: "eager" },
      handleRetry: jest.fn(),
    }));

    render(<HeroImageWithBlurredBackground {...defaultProps} />);

    expect(screen.getByTestId("shimmer-loader")).toBeInTheDocument();
    expect(screen.getByText("Loading image...")).toBeInTheDocument();
  });

  test("handles error state with retry functionality", async () => {
    const handleRetry = jest.fn();
    const { useAdvancedImage } = require("../../../hooks/useAdvancedImage");

    // Mock the hook before rendering - ensure not loading and not retrying to show error
    useAdvancedImage.mockImplementation(() => ({
      imageLoaded: false,
      hasError: true,
      isLoading: false,
      isRetrying: false,
      retryCount: 1,
      currentSrc: "https://example.com/test.jpg",
      position: "center center",
      networkStrategy: { retry: { maxRetries: 2 } },
      handleRetry,
    }));

    const user = userEvent.setup();
    render(<HeroImageWithBlurredBackground {...defaultProps} />);

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByText("Unable to load image")).toBeInTheDocument();

    const retryButton = screen.getByText("Try again");
    await user.click(retryButton);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  test("handles retrying state with proper message", () => {
    const { useAdvancedImage } = require("../../../hooks/useAdvancedImage");

    useAdvancedImage.mockImplementation(() => ({
      imageLoaded: false,
      hasError: false,
      isLoading: false,
      isRetrying: true,
      retryCount: 2,
      currentSrc: "https://example.com/test.jpg",
      position: "center",
      networkStrategy: { loading: "eager" },
      handleRetry: jest.fn(),
    }));

    render(<HeroImageWithBlurredBackground {...defaultProps} />);

    expect(screen.getByText("Retrying... (Attempt 3)")).toBeInTheDocument();
  });

  test("handles successful image load state", () => {
    const { useAdvancedImage } = require("../../../hooks/useAdvancedImage");

    useAdvancedImage.mockImplementation(() => ({
      imageLoaded: true,
      hasError: false,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      currentSrc: "https://example.com/test.jpg",
      position: "center",
      networkStrategy: { loading: "eager" },
      handleRetry: jest.fn(),
    }));

    render(<HeroImageWithBlurredBackground {...defaultProps} />);

    const image = screen.getByTestId("hero-image");
    expect(image).toHaveClass("opacity-100", "scale-100");
    expect(screen.queryByTestId("shimmer-loader")).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  });

  test("handles no src prop correctly", () => {
    render(<HeroImageWithBlurredBackground src="" alt="No image" />);

    expect(screen.getByText("No image available")).toBeInTheDocument();
    expect(screen.queryByTestId("hero-image")).not.toBeInTheDocument();
  });

  test("component has proper displayName", () => {
    expect(HeroImageWithBlurredBackground.displayName).toBe(
      "HeroImageWithBlurredBackground",
    );
  });

  test("properly applies network strategy loading attribute", () => {
    const { useAdvancedImage } = require("../../../hooks/useAdvancedImage");

    useAdvancedImage.mockImplementation(() => ({
      imageLoaded: false,
      hasError: false,
      isLoading: true,
      isRetrying: false,
      retryCount: 0,
      currentSrc: "https://example.com/test.jpg",
      position: "center",
      networkStrategy: { loading: "lazy" },
      handleRetry: jest.fn(),
    }));

    render(<HeroImageWithBlurredBackground {...defaultProps} />);

    const image = screen.getByTestId("hero-image");
    expect(image).toHaveAttribute("loading", "lazy");
  });
});
