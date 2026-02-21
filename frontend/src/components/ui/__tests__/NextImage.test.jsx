import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NextImage from "../NextImage";

// Mock Next.js Image component
jest.mock("next/image", () => {
  const MockImage = React.forwardRef(function MockImage(props, ref) {
    const {
      src,
      alt,
      onError,
      fill,
      width,
      height,
      priority,
      quality,
      placeholder,
      blurDataURL,
      sizes,
      style,
      className,
      loading,
      fetchPriority,
      ...rest
    } = props;

    const handleError = (e) => {
      if (onError) {
        onError(e);
      }
    };

    // Only pass valid DOM attributes to img element
    const validDomProps = {};

    // Copy only valid DOM attributes from rest
    Object.keys(rest).forEach((key) => {
      if (
        key.startsWith("data-") ||
        key.startsWith("aria-") ||
        ["id", "title", "role", "tabIndex", "onClick", "onKeyDown"].includes(
          key,
        )
      ) {
        validDomProps[key] = rest[key];
      }
    });

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        style={style}
        className={className}
        loading={loading}
        onError={handleError}
        data-testid="optimized-image"
        data-priority={priority}
        data-quality={quality}
        data-placeholder={placeholder}
        data-blur-data-url={blurDataURL}
        data-sizes={sizes}
        {...validDomProps}
      />
    );
  });

  MockImage.displayName = "NextImage";
  return MockImage;
});

// Mock network utils
jest.mock("../../../utils/networkUtils", () => ({
  getAdaptiveImageQuality: jest.fn(() => "q_80,"),
}));

describe("NextImage", () => {
  const defaultProps = {
    src: "https://images.rescuedogs.me/test-dog.jpg",
    alt: "Test dog",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders with default props", () => {
      render(<NextImage {...defaultProps} />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", defaultProps.src);
      expect(image).toHaveAttribute("alt", defaultProps.alt);
    });

    it("renders with custom className", () => {
      render(<NextImage {...defaultProps} className="custom-class" />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveClass("custom-class");
    });

    it("renders with fallback src when no src provided", () => {
      render(<NextImage alt="Test" />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute("src", "/placeholder_dog.svg");
    });
  });

  describe("Layout and Dimensions", () => {
    it("renders with responsive layout by default", () => {
      render(<NextImage {...defaultProps} />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute("width", "400");
      expect(image).toHaveAttribute("height", "300"); // 4:3 aspect ratio
    });

    it("renders with fill layout", () => {
      render(<NextImage {...defaultProps} layout="fill" />);

      const image = screen.getByTestId("optimized-image");
      expect(image).not.toHaveAttribute("width");
      expect(image).not.toHaveAttribute("height");
    });

    it("calculates correct dimensions for different aspect ratios", () => {
      const { rerender } = render(
        <NextImage {...defaultProps} aspectRatio="1/1" width={400} />,
      );

      let image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute("height", "400"); // Square

      rerender(<NextImage {...defaultProps} aspectRatio="16/9" width={400} />);
      image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute("height", "225"); // 16:9 ratio
    });

    it("applies correct aspect ratio classes", () => {
      const { rerender } = render(
        <NextImage {...defaultProps} aspectRatio="4/3" />,
      );

      let container = screen.getByTestId("optimized-image").parentElement;
      expect(container).toHaveClass("aspect-[4/3]");

      rerender(<NextImage {...defaultProps} aspectRatio="1/1" />);
      container = screen.getByTestId("optimized-image").parentElement;
      expect(container).toHaveClass("aspect-square");
    });
  });

  describe("R2 Image Detection and Optimization", () => {
    it("detects R2 images correctly", () => {
      const r2Sources = [
        "https://r2.cloudflarestorage.com/test.jpg",
        "https://images.rescuedogs.me/test.jpg",
        "https://cdn.rescuedogs.me/test.jpg",
        "https://images.example.com/test.jpg",
      ];

      r2Sources.forEach((src) => {
        render(<NextImage src={src} alt="Test" />);
        // Component should render (R2 detection is internal)
        expect(screen.getByTestId("optimized-image")).toBeInTheDocument();
        screen.getByTestId("optimized-image").remove();
      });
    });

    it("uses adaptive quality from network utils", () => {
      render(<NextImage {...defaultProps} />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute("data-quality", "80");
    });

    it("uses custom quality when provided", () => {
      render(<NextImage {...defaultProps} quality={90} />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute("data-quality", "90");
    });
  });

  describe("Error Handling", () => {
    it("switches to fallback image on error", async () => {
      const onError = jest.fn();
      render(<NextImage {...defaultProps} onError={onError} />);

      const image = screen.getByTestId("optimized-image");

      // Simulate image error
      fireEvent.error(image);

      await waitFor(() => {
        expect(image).toHaveAttribute("src", "/placeholder_dog.svg");
      });

      expect(onError).toHaveBeenCalled();
    });

    it("prevents error loop with fallback image", async () => {
      const onError = jest.fn();
      render(<NextImage {...defaultProps} onError={onError} />);

      const image = screen.getByTestId("optimized-image");

      // First error - switches to fallback
      fireEvent.error(image);

      await waitFor(() => {
        expect(image).toHaveAttribute("src", "/placeholder_dog.svg");
      });

      // Second error on fallback - should not trigger another switch
      fireEvent.error(image);

      await waitFor(() => {
        expect(image).toHaveAttribute("src", "/placeholder_dog.svg");
        expect(onError).toHaveBeenCalledTimes(1); // Only called once
      });
    });
  });

  describe("Priority Loading", () => {
    it("applies priority attribute when priority is true", () => {
      render(<NextImage {...defaultProps} priority={true} />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute("data-priority", "true");
    });

    it("does not apply priority by default", () => {
      render(<NextImage {...defaultProps} />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute("data-priority", "false");
    });
  });

  describe("Responsive Sizes", () => {
    it("uses default responsive sizes", () => {
      render(<NextImage {...defaultProps} />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute(
        "data-sizes",
        "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
      );
    });

    it("uses custom sizes when provided", () => {
      const customSizes = "(max-width: 768px) 50vw, 25vw";
      render(<NextImage {...defaultProps} sizes={customSizes} />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute("data-sizes", customSizes);
    });

    it("applies preset sizes for known use cases", () => {
      render(<NextImage {...defaultProps} sizes="dog-card" />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute(
        "data-sizes",
        "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
      );
    });

    it("applies preset sizes for organization logos", () => {
      render(<NextImage {...defaultProps} sizes="org-logo" />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute(
        "data-sizes",
        "(max-width: 640px) 64px, (max-width: 1024px) 56px, 64px",
      );
    });
  });

  describe("Blur Placeholder", () => {
    it("generates blur placeholder for R2 images", () => {
      render(<NextImage {...defaultProps} placeholder="blur" />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute("data-placeholder", "blur");
      expect(image).toHaveAttribute("data-blur-data-url");

      const blurDataURL = image.getAttribute("data-blur-data-url");
      expect(blurDataURL).toContain("images.rescuedogs.me");
      expect(blurDataURL).toContain("cdn-cgi/image");
    });

    it("uses default blur for non-R2 images", () => {
      render(
        <NextImage
          src="https://other-domain.com/image.jpg"
          alt="Test"
          placeholder="blur"
        />,
      );

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute("data-placeholder", "blur");

      const blurDataURL = image.getAttribute("data-blur-data-url");
      expect(blurDataURL).toContain("data:image/jpeg;base64");
    });

    it("skips blur placeholder when placeholder is empty", () => {
      render(<NextImage {...defaultProps} placeholder="empty" />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute("data-placeholder", "empty");
    });
  });

  describe("Object Fit and Position", () => {
    it("applies object fit and position styles", () => {
      render(
        <NextImage
          {...defaultProps}
          objectFit="contain"
          objectPosition="top"
        />,
      );

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveStyle({
        objectFit: "contain",
        objectPosition: "top",
      });
    });

    it("uses default object fit and position", () => {
      render(<NextImage {...defaultProps} />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveStyle({
        objectFit: "cover",
        objectPosition: "center 30%",
      });
    });
  });

  describe("Accessibility", () => {
    it("requires alt text", () => {
      // Should not throw when alt is provided
      expect(() => {
        render(<NextImage src="test.jpg" alt="Test image" />);
      }).not.toThrow();
    });

    it("uses provided alt text", () => {
      const altText = "Beautiful rescue dog looking for home";
      render(<NextImage src="test.jpg" alt={altText} />);

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute("alt", altText);
    });
  });

  describe("Performance Props", () => {
    it("forwards additional props to Next Image", () => {
      render(
        <NextImage
          {...defaultProps}
          loading="eager"
          data-custom="test-value"
        />,
      );

      const image = screen.getByTestId("optimized-image");
      expect(image).toHaveAttribute("loading", "eager");
      expect(image).toHaveAttribute("data-custom", "test-value");
    });
  });
});
