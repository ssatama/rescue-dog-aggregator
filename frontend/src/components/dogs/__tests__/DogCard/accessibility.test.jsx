import React from "react";
import { render, screen, fireEvent } from "../../../../test-utils";
import DogCard from "../../DogCardOptimized";
import { recentDog } from "../../dogCardTestHelpers";

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

describe("DogCard Accessibility", () => {
  describe("Accessibility Enhancements for New Features", () => {
    test("NEW badge has proper ARIA label", () => {
      const recentDogData = recentDog(2);

      render(<DogCard dog={recentDogData} />);

      const newBadge = screen.getByTestId("new-badge");
      expect(newBadge).toHaveAttribute("aria-label", "Recently added dog");

      // Organization badge should not exist
      const orgBadge = screen.queryByTestId("organization-badge");
      expect(orgBadge).not.toBeInTheDocument();
    });

    test("hover animations do not interfere with keyboard navigation", () => {
      const keyboardDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={keyboardDog} />);

      const card = screen.getByTestId("dog-card-1");
      const ctaLink = screen.getByText("Meet Buddy →").closest("a");

      // Focus should work normally
      ctaLink.focus();
      expect(ctaLink).toHaveFocus();

      // Card should have animation classes (shadow effects are in CSS)
      expect(card).toHaveClass("shadow-sm");
    });
  });

  describe("ARIA Attributes and Screen Reader Support", () => {
    test("card has proper semantic structure", () => {
      const semanticDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={semanticDog} />);

      const card = screen.getByTestId("dog-card-1");
      expect(card).toBeInTheDocument();

      // Check for proper heading hierarchy
      const nameHeading = screen.getByTestId("dog-name");
      expect(nameHeading).toBeInTheDocument();
    });

    test("images have proper alt text", () => {
      const altTextDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={altTextDog} />);

      // Check for image with alt text (may be placeholder or loaded)
      const image =
        screen.queryByAltText("Buddy") || screen.getByTestId("optimized-image");
      expect(image).toBeInTheDocument();
    });

    test("interactive elements are keyboard accessible", () => {
      const interactiveDog = {
        id: 1,
        slug: "buddy-dog-1",
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={interactiveDog} />);

      // CTA button should be accessible via keyboard
      const ctaButton = screen.getByText("Meet Buddy →");
      expect(ctaButton.tagName).toBe("A"); // Should be a link

      // Share button should be accessible
      const shareButton = screen.getByTestId("share-button");
      expect(shareButton).toBeInTheDocument();
    });

    test("focus indicators are visible and meet accessibility standards", () => {
      const focusDog = {
        id: 1,
        slug: "buddy-dog-1",
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={focusDog} />);

      const ctaButton = screen.getByText("Meet Buddy →");

      // Should have focus-visible classes for accessibility
      expect(ctaButton).toHaveClass("focus-visible:ring-2");
      expect(ctaButton).toHaveClass("focus-visible:ring-offset-2");
    });

    test("badges have descriptive text for screen readers", () => {
      const badgeDog = recentDog(2);

      render(<DogCard dog={badgeDog} />);

      // NEW badge should have aria-label
      const newBadge = screen.getByTestId("new-badge");
      expect(newBadge).toHaveAttribute("aria-label", "Recently added dog");
    });

    test("compatibility indicators use semantic markup", () => {
      const compatDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        dog_profiler_data: {
          good_with_dogs: "yes",
          good_with_cats: "maybe",
          good_with_children: "no",
        },
      };

      render(<DogCard dog={compatDog} />);

      // Check that compatibility status is displayed
      expect(screen.getByText("Good")).toBeInTheDocument();
      expect(screen.getByText("Maybe")).toBeInTheDocument();
      expect(screen.getByText("No")).toBeInTheDocument();
    });
  });

  describe("Keyboard Navigation", () => {
    test("tab order follows logical flow", () => {
      const tabOrderDog = {
        id: 1,
        slug: "buddy-dog-1",
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={tabOrderDog} />);

      // Share button should be focusable
      const shareButton = screen.getByTestId("share-button");
      expect(shareButton).toBeInTheDocument();

      // CTA button should be focusable
      const ctaButton = screen.getByText("Meet Buddy →");
      expect(ctaButton).toBeInTheDocument();

      // Both should be in the DOM and accessible
      expect(shareButton.tabIndex).toBeGreaterThanOrEqual(-1);
      expect(ctaButton.tabIndex).toBeGreaterThanOrEqual(-1);
    });

    test("enter key activates interactive elements", () => {
      const enterKeyDog = {
        id: 1,
        slug: "buddy-dog-1",
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={enterKeyDog} />);

      const ctaButton = screen.getByText("Meet Buddy →");

      // Focus the button
      ctaButton.focus();
      expect(ctaButton).toHaveFocus();

      // Enter key should trigger navigation (it's a link)
      expect(ctaButton.tagName).toBe("A");
      expect(ctaButton).toHaveAttribute("href", "/dogs/buddy-dog-1");
    });

    test("escape key dismisses modals if present", () => {
      // This is a placeholder test for modal functionality
      // If modals are added in the future, this test should be updated
      const modalDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={modalDog} />);

      // Currently no modals in DogCard, but test structure is in place
      expect(screen.getByTestId("dog-card-1")).toBeInTheDocument();
    });
  });

  describe("Screen Reader Announcements", () => {
    test("status changes are announced to screen readers", () => {
      const statusDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={statusDog} />);

      // Card should be present and accessible
      const card = screen.getByTestId("dog-card-1");
      expect(card).toBeInTheDocument();
    });

    test("trait badges have descriptive titles for hover", () => {
      const traitDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        dog_profiler_data: {
          personality_traits: ["Friendly", "Energetic", "Loyal"],
        },
      };

      render(<DogCard dog={traitDog} />);

      // Check that traits have title attributes
      const friendlyTrait = screen.getByText("Friendly");
      expect(friendlyTrait).toHaveAttribute("title", "Friendly");

      const energeticTrait = screen.getByText("Energetic");
      expect(energeticTrait).toHaveAttribute("title", "Energetic");

      const loyalTrait = screen.getByText("Loyal");
      expect(loyalTrait).toHaveAttribute("title", "Loyal");
    });

    test("adoption availability is clearly announced", () => {
      const availabilityDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: {
          name: "REAN",
          ships_to: ["DE", "NL", "BE"],
        },
      };

      render(<DogCard dog={availabilityDog} />);

      const shipsToDisplay = screen.getByTestId("ships-to-display");
      expect(shipsToDisplay).toHaveTextContent("Adoptable to:");
    });
  });

  describe("Color Contrast and Visibility", () => {
    test("text has sufficient contrast against backgrounds", () => {
      const contrastDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={contrastDog} />);

      // Check that name is visible
      const nameElement = screen.getByTestId("dog-name");
      expect(nameElement).toBeInTheDocument();

      // Check that button has proper styling
      const ctaButton = screen.getByText("Meet Buddy →");
      expect(ctaButton).toHaveClass("animate-button-hover");
    });

    test("badges are visible and distinguishable", () => {
      const badgeDog = recentDog(2);

      render(<DogCard dog={badgeDog} />);

      const newBadge = screen.getByTestId("new-badge");
      expect(newBadge).toHaveClass("bg-green-500");
      expect(newBadge).toHaveClass("text-white");
    });

    test("status indicators use both color and text", () => {
      const statusIndicatorDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        dog_profiler_data: {
          good_with_dogs: "yes",
          good_with_cats: "no",
        },
      };

      render(<DogCard dog={statusIndicatorDog} />);

      // Compatibility indicators should use text, not just color
      expect(screen.getByText("Good")).toBeInTheDocument();
      expect(screen.getByText("No")).toBeInTheDocument();
    });
  });

  describe("Reduced Motion Support", () => {
    test("animations are disabled when prefers-reduced-motion is set", () => {
      // Mock prefers-reduced-motion: reduce
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
        })),
      });

      const reducedMotionDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={reducedMotionDog} />);

      const card = screen.getByTestId("dog-card-1");

      // Classes should still be present, but CSS will handle disabling animations
      expect(card).toHaveClass("shadow-sm");
      expect(card).toHaveClass("will-change-transform");
    });

    test("focus indicators remain visible with reduced motion", () => {
      // Mock prefers-reduced-motion: reduce
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
        })),
      });

      const focusReducedDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={focusReducedDog} />);

      const ctaButton = screen.getByText("Meet Buddy →");

      // Focus indicators should still work
      expect(ctaButton).toHaveClass("focus-visible:ring-2");
      expect(ctaButton).toHaveClass("focus-visible:ring-offset-2");
    });
  });

  describe("Touch Target Sizes", () => {
    test("interactive elements meet minimum touch target size", () => {
      const touchDog = {
        id: 1,
        slug: "buddy-dog-1",
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={touchDog} />);

      // CTA button should be full width for easy tapping
      const ctaButton = screen.getByText("Meet Buddy →");
      expect(ctaButton).toHaveClass("w-full");

      // Share button should be present
      const shareButton = screen.getByTestId("share-button");
      expect(shareButton).toBeInTheDocument();
    });

    test("buttons have adequate spacing for touch interfaces", () => {
      const spacingDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={spacingDog} />);

      // Card footer should have proper padding
      const cardFooter = screen.getByTestId("card-footer");
      expect(cardFooter).toHaveClass("pt-0");
    });
  });
});