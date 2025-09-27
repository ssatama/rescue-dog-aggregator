import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FallbackImage } from "../FallbackImage";

// Mock Next.js Image component
jest.mock("next/image", () => ({
  __esModule: true,
  default: jest.fn(({ src, alt, onError, unoptimized, loader, ...props }) => {
    // Filter out Next.js specific props that shouldn't be on HTML img element
    const imgProps = { ...props };
    delete imgProps.fill;
    delete imgProps.sizes;
    delete imgProps.priority;
    delete imgProps.quality;
    delete imgProps.placeholder;
    delete imgProps.blurDataURL;

    return (
      <img
        src={src}
        alt={alt}
        onError={onError}
        data-unoptimized={unoptimized ? "true" : undefined}
        {...imgProps}
      />
    );
  }),
}));

// Mock the R2_CUSTOM_DOMAIN and R2_IMAGE_PATH constants
jest.mock("../../../constants/imageConfig", () => ({
  R2_CUSTOM_DOMAIN: "images.rescuedogs.me",
  R2_IMAGE_PATH: "rescue_dogs",
}));

describe("FallbackImage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = jest.fn(); // Mock console.warn to keep tests clean
  });

  describe("Initial Rendering", () => {
    it("renders with initial source URL", () => {
      render(
        <FallbackImage
          src="https://example.com/dog.jpg"
          alt="Test Dog"
          width={300}
          height={200}
        />,
      );

      const img = screen.getByRole("img", { name: "Test Dog" });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/dog.jpg");
    });

    it("detects R2 images correctly", () => {
      render(
        <FallbackImage
          src="https://images.rescuedogs.me/rescue_dogs/dog.jpg"
          alt="R2 Dog"
          width={300}
          height={200}
        />,
      );

      const img = screen.getByRole("img", { name: "R2 Dog" });
      expect(img).toHaveAttribute("data-unoptimized", "true");
    });
  });

  describe("Fallback Mechanism", () => {
    it("falls back to R2 with Cloudflare transformations on first error", async () => {
      const { rerender } = render(
        <FallbackImage
          src="https://example.com/dog.jpg"
          alt="Test Dog"
          width={300}
          height={200}
        />,
      );

      const img = screen.getByRole("img", { name: "Test Dog" });

      // Simulate image load error
      fireEvent.error(img);

      await waitFor(() => {
        expect(img).toHaveAttribute(
          "src",
          "https://images.rescuedogs.me/cdn-cgi/image/w=800,q=80,f=auto/rescue_dogs/dog.jpg",
        );
      });
    });

    it("falls back to direct R2 URL on second error", async () => {
      render(
        <FallbackImage
          src="https://images.rescuedogs.me/cdn-cgi/image/w=800,q=80,f=auto/rescue_dogs/dog.jpg"
          alt="Test Dog"
          width={300}
          height={200}
        />,
      );

      const img = screen.getByRole("img", { name: "Test Dog" });

      // Simulate first error (already with transformations)
      fireEvent.error(img);

      await waitFor(() => {
        expect(img).toHaveAttribute(
          "src",
          "https://images.rescuedogs.me/rescue_dogs/dog.jpg",
        );
      });
    });

    it("falls back to placeholder image on third error", async () => {
      render(
        <FallbackImage
          src="https://example.com/dog.jpg"
          alt="Test Dog"
          width={300}
          height={200}
          fallbackSrc="/custom-placeholder.svg"
        />,
      );

      const img = screen.getByRole("img", { name: "Test Dog" });

      // Simulate multiple errors
      fireEvent.error(img); // First error
      await waitFor(() => {
        expect(img.getAttribute("src")).toContain("cdn-cgi/image");
      });

      fireEvent.error(img); // Second error
      await waitFor(() => {
        expect(img.getAttribute("src")).not.toContain("cdn-cgi/image");
      });

      fireEvent.error(img); // Third error
      await waitFor(() => {
        expect(img).toHaveAttribute("src", "/custom-placeholder.svg");
      });
    });

    it("shows emoji placeholder when all fallbacks fail", async () => {
      const { container } = render(
        <FallbackImage
          src="https://example.com/dog.jpg"
          alt="Test Dog"
          width={300}
          height={200}
        />,
      );

      const img = screen.getByRole("img", { name: "Test Dog" });

      // Simulate all fallback failures
      fireEvent.error(img); // First error
      await waitFor(() => fireEvent.error(img)); // Second error
      await waitFor(() => fireEvent.error(img)); // Third error
      await waitFor(() => fireEvent.error(img)); // Final error

      await waitFor(() => {
        const emojiContainer = container.querySelector(".text-6xl");
        expect(emojiContainer).toBeInTheDocument();
        expect(emojiContainer?.textContent).toBe("🐕");
      });
    });
  });

  describe("R2 URL Handling", () => {
    it("handles R2 URLs with existing transformations correctly", () => {
      render(
        <FallbackImage
          src="https://images.rescuedogs.me/cdn-cgi/image/w=1200,q=90,f=auto/rescue_dogs/dog.jpg"
          alt="Test Dog"
          width={300}
          height={200}
        />,
      );

      const img = screen.getByRole("img", { name: "Test Dog" });
      expect(img).toHaveAttribute(
        "src",
        "https://images.rescuedogs.me/cdn-cgi/image/w=1200,q=90,f=auto/rescue_dogs/dog.jpg",
      );

      // Simulate error to test transformation removal
      fireEvent.error(img);

      waitFor(() => {
        expect(img).toHaveAttribute(
          "src",
          "https://images.rescuedogs.me/rescue_dogs/dog.jpg",
        );
      });
    });

    it("handles r2.cloudflarestorage.com URLs", () => {
      render(
        <FallbackImage
          src="https://bucket.r2.cloudflarestorage.com/rescue_dogs/dog.jpg"
          alt="Test Dog"
          width={300}
          height={200}
        />,
      );

      const img = screen.getByRole("img", { name: "Test Dog" });
      expect(img).toHaveAttribute("data-unoptimized", "true");
    });
  });

  describe("Custom Error Handler", () => {
    it("calls custom onError handler when provided", async () => {
      const customOnError = jest.fn();

      render(
        <FallbackImage
          src="https://example.com/dog.jpg"
          alt="Test Dog"
          width={300}
          height={200}
          onError={customOnError}
        />,
      );

      const img = screen.getByRole("img", { name: "Test Dog" });
      fireEvent.error(img);

      await waitFor(() => {
        expect(customOnError).toHaveBeenCalled();
      });
    });
  });

  describe("Source URL Changes", () => {
    it("resets fallback level when src prop changes", async () => {
      const { rerender } = render(
        <FallbackImage
          src="https://example.com/dog1.jpg"
          alt="Test Dog"
          width={300}
          height={200}
        />,
      );

      const img = screen.getByRole("img", { name: "Test Dog" });

      // Trigger error and fallback
      fireEvent.error(img);
      await waitFor(() => {
        expect(img.getAttribute("src")).toContain("cdn-cgi/image");
      });

      // Change src prop
      rerender(
        <FallbackImage
          src="https://example.com/dog2.jpg"
          alt="Test Dog"
          width={300}
          height={200}
        />,
      );

      await waitFor(() => {
        expect(img).toHaveAttribute("src", "https://example.com/dog2.jpg");
      });
    });
  });

  describe("Next.js Image Optimization Bypass", () => {
    it("bypasses Next.js optimization for R2 images", () => {
      render(
        <FallbackImage
          src="https://images.rescuedogs.me/rescue_dogs/dog.jpg"
          alt="Test Dog"
          width={300}
          height={200}
        />,
      );

      const img = screen.getByRole("img", { name: "Test Dog" });
      expect(img).toHaveAttribute("data-unoptimized", "true");
    });

    it("bypasses optimization after fallback", async () => {
      render(
        <FallbackImage
          src="https://example.com/dog.jpg"
          alt="Test Dog"
          width={300}
          height={200}
        />,
      );

      const img = screen.getByRole("img", { name: "Test Dog" });
      expect(img).not.toHaveAttribute("data-unoptimized", "true");

      // Trigger fallback
      fireEvent.error(img);

      await waitFor(() => {
        expect(img).toHaveAttribute("data-unoptimized", "true");
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles malformed URLs gracefully", async () => {
      render(
        <FallbackImage
          src="not-a-valid-url"
          alt="Test Dog"
          width={300}
          height={200}
          fallbackSrc="/fallback.svg"
        />,
      );

      const img = screen.getByRole("img", { name: "Test Dog" });

      // For malformed URLs, it should skip R2 fallbacks and go directly to fallbackSrc
      fireEvent.error(img); // First error - goes directly to fallback

      await waitFor(() => {
        expect(img).toHaveAttribute("src", "/fallback.svg");
      });
    });

    it("handles missing file extensions", () => {
      render(
        <FallbackImage
          src="https://example.com/image-without-extension"
          alt="Test Dog"
          width={300}
          height={200}
        />,
      );

      const img = screen.getByRole("img", { name: "Test Dog" });
      fireEvent.error(img);

      // Should still attempt fallback
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("maintains alt text through all fallback stages", async () => {
      render(
        <FallbackImage
          src="https://example.com/dog.jpg"
          alt="Friendly Golden Retriever"
          width={300}
          height={200}
        />,
      );

      const img = screen.getByRole("img", {
        name: "Friendly Golden Retriever",
      });

      // Trigger multiple fallbacks
      fireEvent.error(img);
      await waitFor(() => fireEvent.error(img));
      await waitFor(() => fireEvent.error(img));

      // Alt text should remain
      expect(
        screen.getByRole("img", { name: "Friendly Golden Retriever" }),
      ).toBeInTheDocument();
    });

    it("provides proper ARIA attributes for emoji placeholder", async () => {
      const { container } = render(
        <FallbackImage
          src="https://example.com/dog.jpg"
          alt="Test Dog"
          width={300}
          height={200}
        />,
      );

      const img = screen.getByRole("img", { name: "Test Dog" });

      // Trigger all fallbacks
      for (let i = 0; i < 4; i++) {
        fireEvent.error(img);
        await waitFor(() => {});
      }

      await waitFor(() => {
        const placeholder = container.querySelector('[role="img"]');
        expect(placeholder).toHaveAttribute("aria-label", "Test Dog");
      });
    });
  });
});
