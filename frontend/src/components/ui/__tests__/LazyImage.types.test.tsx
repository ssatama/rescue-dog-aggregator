import React from "react";
import { render, screen } from "../../../test-utils";
import userEvent from "@testing-library/user-event";
import LazyImage, { LazyImageProps } from "../LazyImage";

// Mock the useLazyImage hook
jest.mock("../../../hooks/useLazyImage", () => ({
  useLazyImage: jest.fn(() => ({
    isLoaded: false,
    isInView: true,
    hasError: false,
    lowQualityLoaded: false,
    blurPlaceholderLoaded: false,
    imgRef: { current: null },
    progressiveUrls: {
      lowQuality: "low-quality.jpg",
      blurPlaceholder: "blur.jpg",
    },
    handlers: {
      onLoad: jest.fn(),
      onError: jest.fn(),
      onLowQualityLoad: jest.fn(),
      onBlurPlaceholderLoad: jest.fn(),
    },
  })),
}));

describe("LazyImage TypeScript Tests", () => {
  const defaultProps: LazyImageProps = {
    src: "https://example.com/test.jpg",
    alt: "Test image",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset to default mock implementation
    const { useLazyImage } = require("../../../hooks/useLazyImage");
    useLazyImage.mockImplementation(() => ({
      isLoaded: false,
      isInView: false,
      hasError: false,
      lowQualityLoaded: false,
      blurPlaceholderLoaded: false,
      imgRef: { current: null },
      progressiveUrls: {},
      handlers: {
        onLoad: jest.fn(),
        onError: jest.fn(),
        onLowQualityLoad: jest.fn(),
        onBlurPlaceholderLoad: jest.fn(),
      },
    }));
  });

  test("accepts required props with proper types", () => {
    render(<LazyImage {...defaultProps} />);

    expect(screen.getByTestId("image-placeholder")).toBeInTheDocument();
  });

  test("accepts optional className prop", () => {
    const className = "custom-image-class";

    render(<LazyImage {...defaultProps} className={className} />);

    // Check if className is applied to the main image
    const images = screen.getAllByRole("img", { hidden: true });
    expect(images.some((img) => img.className.includes(className))).toBe(true);
  });

  test("accepts optional placeholder prop", () => {
    const customPlaceholder = (
      <div data-testid="custom-placeholder">Loading...</div>
    );

    render(<LazyImage {...defaultProps} placeholder={customPlaceholder} />);

    expect(screen.getByTestId("custom-placeholder")).toBeInTheDocument();
  });

  test("accepts optional callback props", () => {
    const onLoad = jest.fn();
    const onError = jest.fn();

    render(<LazyImage {...defaultProps} onLoad={onLoad} onError={onError} />);

    expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();
  });

  test("accepts optional progressive loading props", () => {
    const props: LazyImageProps = {
      ...defaultProps,
      enableProgressiveLoading: true,
      priority: true,
    };

    render(<LazyImage {...props} />);

    expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();
  });

  test("accepts optional sizes prop", () => {
    const sizes = "(max-width: 768px) 100vw, 50vw";
    const testId = "lazy-image-under-test";
    const { useLazyImage } = require("../../../hooks/useLazyImage");

    useLazyImage.mockImplementation(() => ({
      isLoaded: false,
      isInView: true, // CRITICAL: This ensures the <img> tags are rendered
      hasError: false,
      lowQualityLoaded: false,
      blurPlaceholderLoaded: false,
      imgRef: { current: null },
      progressiveUrls: {},
      handlers: {
        onLoad: jest.fn(),
        onError: jest.fn(),
        onLowQualityLoad: jest.fn(),
        onBlurPlaceholderLoad: jest.fn(),
      },
    }));

    // Pass a data-testid, which will be spread onto the <img> element via ...props
    render(<LazyImage {...defaultProps} sizes={sizes} data-testid={testId} />);

    // Use the specific test ID to select the final image element
    const image = screen.getByTestId(testId);

    expect(image).toHaveAttribute("sizes", sizes);
    expect(image.tagName).toBe("IMG"); // Good to verify we got the right element type
  });

  test("renders the final image correctly with all props when in view", () => {
    const { useLazyImage } = require("../../../hooks/useLazyImage");

    useLazyImage.mockImplementation(() => ({
      isLoaded: false,
      isInView: true, // CRITICAL: Renders the <img>
      hasError: false,
      lowQualityLoaded: false,
      blurPlaceholderLoaded: false,
      imgRef: { current: null },
      progressiveUrls: {},
      handlers: {
        onLoad: jest.fn(),
        onError: jest.fn(),
        onLowQualityLoad: jest.fn(),
        onBlurPlaceholderLoad: jest.fn(),
      },
    }));

    const props: LazyImageProps = {
      src: "https://example.com/test.jpg",
      alt: "Test image",
      className: "custom-class",
      placeholder: <div>Custom placeholder</div>,
      onLoad: jest.fn(),
      onError: jest.fn(),
      enableProgressiveLoading: false, // Keep it simple for this test
      priority: false,
      sizes: "(max-width: 768px) 100vw, 50vw",
    };

    render(<LazyImage {...props} />);

    // Query by alt text, which is a good user-facing attribute
    const image = screen.getByRole("img", { name: "Test image", hidden: true });

    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", props.src);
    expect(image).toHaveClass("custom-class");
    expect(image).toHaveAttribute("sizes", props.sizes);
  });

  test("renders a custom placeholder when not in view", () => {
    const { useLazyImage } = require("../../../hooks/useLazyImage");

    useLazyImage.mockImplementation(() => ({
      isLoaded: false,
      isInView: false, // CRITICAL: Renders the placeholder
      hasError: false,
      lowQualityLoaded: false,
      blurPlaceholderLoaded: false,
      imgRef: { current: null },
      progressiveUrls: {},
      handlers: {
        onLoad: jest.fn(),
        onError: jest.fn(),
        onLowQualityLoad: jest.fn(),
        onBlurPlaceholderLoad: jest.fn(),
      },
    }));

    const props: LazyImageProps = {
      src: "https://example.com/test.jpg",
      alt: "Test image",
      placeholder: <div>My Custom Placeholder</div>,
    };

    render(<LazyImage {...props} />);

    // Assert the custom placeholder is rendered
    expect(screen.getByText("My Custom Placeholder")).toBeInTheDocument();

    // Assert no <img> tag is rendered yet, as it's not in view
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  test("handles error state with proper TypeScript types", () => {
    const { useLazyImage } = require("../../../hooks/useLazyImage");

    useLazyImage.mockImplementation(() => ({
      isLoaded: false,
      isInView: true,
      hasError: true,
      lowQualityLoaded: false,
      blurPlaceholderLoaded: false,
      imgRef: { current: null },
      progressiveUrls: {},
      handlers: {
        onLoad: jest.fn(),
        onError: jest.fn(),
        onLowQualityLoad: jest.fn(),
        onBlurPlaceholderLoad: jest.fn(),
      },
    }));

    render(<LazyImage {...defaultProps} />);

    expect(screen.getByTestId("image-error")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Test image - Failed to load"),
    ).toBeInTheDocument();
  });

  test("handles loading state with placeholder", () => {
    const { useLazyImage } = require("../../../hooks/useLazyImage");

    useLazyImage.mockImplementation(() => ({
      isLoaded: false,
      isInView: false,
      hasError: false,
      lowQualityLoaded: false,
      blurPlaceholderLoaded: false,
      imgRef: { current: null },
      progressiveUrls: {},
      handlers: {
        onLoad: jest.fn(),
        onError: jest.fn(),
        onLowQualityLoad: jest.fn(),
        onBlurPlaceholderLoad: jest.fn(),
      },
    }));

    render(<LazyImage {...defaultProps} />);

    expect(screen.getByTestId("image-placeholder")).toBeInTheDocument();
    expect(screen.getByLabelText("Test image")).toBeInTheDocument();
  });

  test("handles progressive loading states", () => {
    const { useLazyImage } = require("../../../hooks/useLazyImage");

    useLazyImage.mockImplementation(() => ({
      isLoaded: false,
      isInView: true,
      hasError: false,
      lowQualityLoaded: true,
      blurPlaceholderLoaded: false,
      imgRef: { current: null },
      progressiveUrls: {
        lowQuality: "low-quality.jpg",
        blurPlaceholder: "blur.jpg",
      },
      handlers: {
        onLoad: jest.fn(),
        onError: jest.fn(),
        onLowQualityLoad: jest.fn(),
        onBlurPlaceholderLoad: jest.fn(),
      },
    }));

    render(<LazyImage {...defaultProps} enableProgressiveLoading={true} />);

    // Should show the main image and low quality version
    const images = screen.getAllByRole("img", { hidden: true });
    expect(images.length).toBeGreaterThan(1);
  });

  test("handles successful image load state", () => {
    const { useLazyImage } = require("../../../hooks/useLazyImage");

    useLazyImage.mockImplementation(() => ({
      isLoaded: true,
      isInView: true,
      hasError: false,
      lowQualityLoaded: false,
      blurPlaceholderLoaded: false,
      imgRef: { current: null },
      progressiveUrls: {},
      handlers: {
        onLoad: jest.fn(),
        onError: jest.fn(),
        onLowQualityLoad: jest.fn(),
        onBlurPlaceholderLoad: jest.fn(),
      },
    }));

    render(<LazyImage {...defaultProps} />);

    const image = screen.getByRole("img", { hidden: true });
    expect(image).toHaveClass("opacity-100");
    expect(screen.queryByTestId("image-placeholder")).not.toBeInTheDocument();
    expect(screen.queryByTestId("image-error")).not.toBeInTheDocument();
  });

  test("properly spreads additional props to img elements", () => {
    const { useLazyImage } = require("../../../hooks/useLazyImage");

    useLazyImage.mockImplementation(() => ({
      isLoaded: false,
      isInView: true, // CRITICAL: Ensures the <img> is rendered
      hasError: false,
      lowQualityLoaded: false,
      blurPlaceholderLoaded: false,
      imgRef: { current: null },
      progressiveUrls: {},
      handlers: {
        onLoad: jest.fn(),
        onError: jest.fn(),
        onLowQualityLoad: jest.fn(),
        onBlurPlaceholderLoad: jest.fn(),
      },
    }));

    const additionalProps = {
      "data-testid": "custom-image",
      title: "Custom title",
    };

    render(<LazyImage {...defaultProps} {...additionalProps} />);

    const image = screen.getByTestId("custom-image");
    expect(image).toHaveAttribute("title", "Custom title");
  });

  test("component supports React.FC type correctly", () => {
    const { useLazyImage } = require("../../../hooks/useLazyImage");

    useLazyImage.mockImplementation(() => ({
      isLoaded: false,
      isInView: true,
      hasError: false,
      lowQualityLoaded: false,
      blurPlaceholderLoaded: false,
      imgRef: { current: null },
      progressiveUrls: {},
      handlers: {
        onLoad: jest.fn(),
        onError: jest.fn(),
        onLowQualityLoad: jest.fn(),
        onBlurPlaceholderLoad: jest.fn(),
      },
    }));

    // This test ensures the component is properly typed as a functional component
    const Component: React.FC<LazyImageProps> = LazyImage;

    render(<Component {...defaultProps} data-testid="type-test-image" />);

    expect(screen.getByTestId("type-test-image")).toBeInTheDocument();
  });

  test("handles ref forwarding correctly", () => {
    const { useLazyImage } = require("../../../hooks/useLazyImage");
    const mockRef = { current: document.createElement("div") };

    useLazyImage.mockImplementation(() => ({
      isLoaded: false,
      isInView: true,
      hasError: false,
      lowQualityLoaded: false,
      blurPlaceholderLoaded: false,
      imgRef: mockRef,
      progressiveUrls: {},
      handlers: {
        onLoad: jest.fn(),
        onError: jest.fn(),
        onLowQualityLoad: jest.fn(),
        onBlurPlaceholderLoad: jest.fn(),
      },
    }));

    render(<LazyImage {...defaultProps} data-testid="ref-test-image" />);

    // The component should render successfully with the ref
    const image = screen.getByTestId("ref-test-image");
    expect(image).toBeInTheDocument();
  });
});
