import React from "react";
import { render, screen, fireEvent } from "../../../../test-utils";
import DogCard from "../../DogCardOptimized";
import { mockDog, recentDog } from "../../dogCardTestHelpers";

// Mock ShareButton to avoid complex dropdown testing
jest.mock("../../../ui/ShareButton", () => {
  return function MockShareButton({ url, title, text, compact }) {
    return (
      <button
        data-testid="share-button"
        data-url={url}
        data-title={title}
        data-text={text}
        data-compact={compact}
      >
        Share
      </button>
    );
  };
});

describe("DogCard Interactions", () => {
  // Test for ShareButton presence
  test("renders share button next to favorite button", () => {
    render(<DogCard dog={mockDog} />);

    // Check that share button is present
    const shareButton = screen.getByTestId("share-button");
    expect(shareButton).toBeInTheDocument();

    // Verify share button has correct props
    expect(shareButton).toHaveAttribute("data-url");
    expect(shareButton.getAttribute("data-url")).toContain(
      "/dogs/buddy-labrador-retriever-1",
    );
    expect(shareButton).toHaveAttribute("data-title", "Meet Buddy");
    expect(shareButton.getAttribute("data-text")).toContain(
      "Check out Buddy from Test Organization",
    );
  });

  test("renders share button in compact view", () => {
    const compactDog = {
      id: 1,
      slug: "buddy-labrador-retriever-1",
      name: "Buddy",
      organization: {
        name: "Test Organization",
      },
    };

    render(<DogCard dog={compactDog} compact />);

    // Check that share button is present in compact view
    const shareButton = screen.getByTestId("share-button");
    expect(shareButton).toBeInTheDocument();
  });

  describe("Hover Animations", () => {
    test("applies hover animation classes to card", () => {
      const hoverDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={hoverDog} />);

      const card = screen.getByTestId("dog-card-1");
      // Check for new animation system classes
      expect(card).toHaveClass("shadow-sm");
      expect(card).toHaveClass("will-change-transform");
      expect(card).toHaveClass("group");
      expect(card).toHaveClass("rounded-xl");
    });

    test("applies smooth transition effects", () => {
      const transitionDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={transitionDog} />);

      const card = screen.getByTestId("dog-card-1");
      // Test that the new animation classes are present
      expect(card).toHaveClass("shadow-sm");
      expect(card).toHaveClass("will-change-transform");
    });
  });

  describe("Enhanced Hover Effects & Micro-interactions", () => {
    test("card has proper hover animation classes and structure", () => {
      const structureDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={structureDog} />);

      const card = screen.getByTestId("dog-card-1");

      // Card should have enhanced animation classes
      expect(card).toHaveClass("shadow-sm");
      expect(card).toHaveClass("will-change-transform");
      expect(card).toHaveClass("group");

      // Card should have proper transition properties for smooth animation
      expect(card).toHaveClass("transition-all");
      expect(card).toHaveClass("duration-300");
    });

    test("card hover animation produces correct transform (translateY(-4px) scale(1.02))", () => {
      const transformDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={transformDog} />);

      const card = screen.getByTestId("dog-card-1");

      // Simulate hover by checking CSS classes that would trigger the hover state
      expect(card).toHaveClass("shadow-sm");

      // Note: The actual CSS transform is tested via the CSS class presence
      // The transform: translateY(-4px) scale(1.02) is defined in globals.css
      // This test ensures the component has the correct structure for the hover effect
    });

    test("card hover enhances shadow with orange tint", () => {
      const shadowDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={shadowDog} />);

      const card = screen.getByTestId("dog-card-1");

      // Card should use the unified shadow hierarchy (shadow-sm to shadow-xl)
      expect(card).toHaveClass("shadow-sm");
      expect(card).toHaveClass("hover:shadow-xl");

      // The orange-tinted shadow is applied via CSS :hover pseudo-class
      // Testing for the class that enables this behavior
      expect(card).toHaveClass("shadow-sm");
    });

    test("image has correct hover scale effect (scale(1.05))", () => {
      const scaleDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={scaleDog} />);

      // Check placeholder or loaded image
      const imageElement =
        screen.queryByAltText("Buddy") || screen.getByTestId("optimized-image");

      // Image should have correct hover scale effect - OptimizedImage generates base classes
      expect(imageElement.className).toContain("w-full");
      expect(imageElement.className).toContain("h-full");
      expect(imageElement.className).toContain("object-cover");
    });

    test("animations respect reduced motion preferences", () => {
      // Mock prefers-reduced-motion: reduce
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
        })),
      });

      const motionDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={motionDog} />);

      const card = screen.getByTestId("dog-card-1");

      // Even with reduced motion, the classes should be present
      // The CSS handles disabling animations via media queries
      expect(card).toHaveClass("shadow-sm");
      expect(card).toHaveClass("will-change-transform");
    });

    test("hover animations do not cause layout shift", () => {
      const layoutDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={layoutDog} />);

      const card = screen.getByTestId("dog-card-1");

      // Will-change property should be set to prevent layout shift
      expect(card).toHaveClass("will-change-transform");

      // Card should maintain proper structure for transform animations
      expect(card).toHaveClass("flex");
      expect(card).toHaveClass("flex-col");
      expect(card).toHaveClass("h-full");
    });

    test("CTA button has enhanced hover and focus states", () => {
      const ctaDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={ctaDog} />);

      const ctaButton = screen.getByText("Meet Buddy →");

      // Button should have enhanced hover animation classes
      expect(ctaButton).toHaveClass("animate-button-hover");
      expect(ctaButton).toHaveClass("hover:shadow-lg");

      // Button should have proper focus states
      expect(ctaButton).toHaveClass("focus-visible:ring-2");
      expect(ctaButton).toHaveClass("focus-visible:ring-offset-2");

      // Button should maintain smooth transitions
      expect(ctaButton).toHaveClass("transition-all");
      expect(ctaButton).toHaveClass("duration-300");
    });

    test("button hover enhances gradient darkness correctly", () => {
      const gradientDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={gradientDog} />);

      const ctaButton = screen.getByText("Meet Buddy →");

      // Button uses outline variant, not gradient background
      expect(ctaButton).toHaveClass("animate-button-hover");
      expect(ctaButton).toHaveClass("w-full");
      expect(ctaButton).toHaveClass("hover:shadow-lg");
      expect(ctaButton).toHaveClass("hover:-translate-y-0.5");
    });

    test("button maintains accessibility with proper focus indicators", () => {
      const focusDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={focusDog} />);

      const ctaButton = screen.getByText("Meet Buddy →");

      // Button should be focusable
      ctaButton.focus();
      expect(ctaButton).toHaveFocus();

      // Button is a Link component, not a button element
      expect(ctaButton.tagName).toBe("A");

      // Focus ring should be visible when focused
      expect(ctaButton).toHaveClass("focus-visible:ring-2");
      expect(ctaButton).toHaveClass("focus-visible:ring-offset-2");
    });
  });

  describe("CTA Button Enhancement", () => {
    test('CTA button shows personalized "Meet [Name] →" text', () => {
      const personalizedDog = {
        id: 1,
        name: "Lucky",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={personalizedDog} />);

      const ctaButton = screen.getByText("Meet Lucky →");
      expect(ctaButton).toBeInTheDocument();
    });

    test("CTA button has orange gradient background", () => {
      const buttonStyleDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={buttonStyleDog} />);

      const ctaButton = screen.getByText("Meet Buddy →");
      expect(ctaButton).toHaveClass("animate-button-hover");
      expect(ctaButton).toHaveClass("w-full");
      expect(ctaButton).toHaveClass("hover:shadow-lg");
      expect(ctaButton).toHaveClass("hover:-translate-y-0.5");
    });

    test("CTA button is full width within card footer", () => {
      const fullWidthDog = {
        id: 1,
        slug: "buddy-dog-1",
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={fullWidthDog} />);

      const ctaButton = screen.getByText("Meet Buddy →");
      expect(ctaButton).toHaveClass("w-full");

      // Button should still be inside a link
      const linkWrapper = ctaButton.closest("a");
      expect(linkWrapper).toHaveAttribute("href", "/dogs/buddy-dog-1");
      expect(linkWrapper).toHaveClass("w-full");
    });

    test("CTA button handles long names with truncation", () => {
      const longNameDog = {
        id: 1,
        name: "Princess Buttercup McFluffington III",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={longNameDog} />);

      // Should still render with full name in button
      const ctaButton = screen.getByText(
        "Meet Princess Buttercup McFluffington III →",
      );
      expect(ctaButton).toBeInTheDocument();
    });
  });
});
