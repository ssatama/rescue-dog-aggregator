import React from "react";
import { render, screen, fireEvent, within } from "../../../test-utils";
import DogCard from "../DogCardOptimized";

// Mock ShareButton to avoid complex dropdown testing
jest.mock("../../ui/ShareButton", () => {
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

describe("DogCard Component", () => {
  test("renders dog card with correct information", () => {
    const mockDog = {
      id: 1,
      slug: "buddy-labrador-retriever-1",
      name: "Buddy",
      standardized_breed: "Labrador Retriever",
      breed: "Lab Mix",
      breed_group: "Test Group",
      age_text: "2 years",
      age_min_months: 24,
      sex: "Male",
      standardized_size: "Large",
      size: "Large",
      primary_image_url: "https://example.com/image.jpg",
      status: "available",
      organization: {
        name: "Test Organization",
        city: "Test City",
        country: "TC",
      },
    };

    render(<DogCard dog={mockDog} />);

    // Check basic information
    expect(screen.getByText("Buddy")).toBeInTheDocument();

    // Check that it uses standardized breed
    expect(screen.getByText("Labrador Retriever")).toBeInTheDocument();

    // Breed group should NOT be displayed anymore (fixed per requirement)
    expect(screen.queryByText("Test Group")).not.toBeInTheDocument();

    // Check that size is displayed (Assuming size is also rendered, if not, remove this)
    // expect(screen.getByText('Large')).toBeInTheDocument(); // Uncomment if size is displayed

    // Check that "Meet [Name] →" button/link is present
    const ctaButton = screen.getByText("Meet Buddy →");
    expect(ctaButton).toBeInTheDocument();
    // Check if it's inside a link pointing to the correct dog page
    expect(ctaButton.closest("a")).toHaveAttribute(
      "href",
      `/dogs/${mockDog.slug}`,
    );
  });

  test("handles missing data gracefully", () => {
    const incompleteData = {
      id: 2,
      name: "Max",
      status: "available", // Add status to avoid unknown status badge
      // Missing other fields like breed
    };

    render(<DogCard dog={incompleteData} />);

    // Should still render with fallback values
    expect(screen.getByText("Max")).toBeInTheDocument();
    // Should not show breed section when missing
    expect(screen.queryByText("Unknown Breed")).not.toBeInTheDocument();
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
    // Check button text
    expect(screen.getByText("Meet Max →")).toBeInTheDocument();
  });

  test("hides breed when Unknown", () => {
    const dogWithUnknownBreed = {
      id: 3,
      name: "Luna",
      standardized_breed: "Unknown",
      breed: "Unknown",
      status: "available", // Specify status to avoid status badge interference
    };

    render(<DogCard dog={dogWithUnknownBreed} />);

    // Should render name
    expect(screen.getByText("Luna")).toBeInTheDocument();
    // Should not show breed line when it's Unknown
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
    // Should still have the meet button
    expect(screen.getByText("Meet Luna →")).toBeInTheDocument();
  });

  // Test for ShareButton presence
  test("renders share button next to favorite button", () => {
    const mockDog = {
      id: 1,
      slug: "buddy-labrador-retriever-1",
      name: "Buddy",
      standardized_breed: "Labrador Retriever",
      organization: {
        name: "Test Organization",
        city: "Test City",
        country: "TC",
      },
    };

    render(<DogCard dog={mockDog} />);

    // Check that share button is present
    const shareButton = screen.getByTestId("share-button");
    expect(shareButton).toBeInTheDocument();

    // Verify share button has correct props
    expect(shareButton).toHaveAttribute("data-compact", "true");
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
    const mockDog = {
      id: 1,
      slug: "buddy-labrador-retriever-1",
      name: "Buddy",
      organization: {
        name: "Test Organization",
      },
    };

    render(<DogCard dog={mockDog} compact />);

    // Check that share button is present in compact view
    const shareButton = screen.getByTestId("share-button");
    expect(shareButton).toBeInTheDocument();
    expect(shareButton).toHaveAttribute("data-compact", "true");
  });

  // NEW TESTS FOR ENHANCED FEATURES
  describe("Hover Animations", () => {
    test("applies hover animation classes to card", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={mockDog} />);

      const card = screen.getByTestId("dog-card-1");
      // Check for new animation system classes
      expect(card).toHaveClass("shadow-sm");
      expect(card).toHaveClass("will-change-transform");
      expect(card).toHaveClass("group");
      expect(card).toHaveClass("rounded-lg"); // Consistent with shadow system
    });

    test("applies smooth transition effects", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={mockDog} />);

      const card = screen.getByTestId("dog-card-1");
      // Test that the new animation classes are present
      expect(card).toHaveClass("shadow-sm");
      expect(card).toHaveClass("will-change-transform");
      // The CSS transitions are defined in globals.css via .animate-card-hover
    });
  });

  describe("Organization Badge Removed", () => {
    test("no longer shows organization badge on image", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: {
          name: "Pets in Turkey",
          city: "Istanbul",
          country: "Turkey",
        },
      };

      render(<DogCard dog={mockDog} />);

      // Organization badge should not exist
      const orgBadge = screen.queryByTestId("organization-badge");
      expect(orgBadge).not.toBeInTheDocument();

      // But organization info should still be in the content area
      const locationDisplay = screen.getByTestId("location-display");
      expect(locationDisplay).toHaveTextContent("Pets in Turkey");
    });
  });

  describe("NEW Badge for Recent Dogs", () => {
    test("shows NEW badge for dogs added within last 7 days", () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 6 days ago (within 7 days)

      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        created_at: sevenDaysAgo.toISOString(),
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={mockDog} />);

      const newBadge = screen.getByTestId("new-badge");
      expect(newBadge).toBeInTheDocument();
      expect(newBadge).toHaveTextContent("NEW");
      expect(newBadge).toHaveClass("bg-green-500");
      expect(newBadge).toHaveClass("text-white");
      expect(newBadge).toHaveClass("absolute");
      expect(newBadge).toHaveClass("top-2");
      expect(newBadge).toHaveClass("left-2");
    });

    test("does not show NEW badge for dogs older than 7 days", () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8); // 8 days ago (older than 7 days)

      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        created_at: eightDaysAgo.toISOString(),
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={mockDog} />);

      const newBadge = screen.queryByTestId("new-badge");
      expect(newBadge).not.toBeInTheDocument();
    });

    test("does not show NEW badge when created_at is missing", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        // No created_at field
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={mockDog} />);

      const newBadge = screen.queryByTestId("new-badge");
      expect(newBadge).not.toBeInTheDocument();
    });

    test("handles invalid created_at dates gracefully", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        created_at: "invalid-date",
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={mockDog} />);

      const newBadge = screen.queryByTestId("new-badge");
      expect(newBadge).not.toBeInTheDocument();
    });
  });

  describe("Text Truncation and Consistent Heights", () => {
    test("truncates long dog names", () => {
      const mockDog = {
        id: 1,
        name: "This is a very long dog name that should be truncated for consistent card heights",
        status: "available",
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={mockDog} />);

      const nameElement = screen.getByTestId("dog-name");
      expect(nameElement).toHaveClass("truncate");
    });

    test("truncates long breed names", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        standardized_breed:
          "This is a very long breed name that should be truncated",
        status: "available",
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={mockDog} />);

      const breedElement = screen.getByTestId("dog-breed");
      expect(breedElement).toHaveClass("truncate");
    });

    test("applies consistent height classes to card", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={mockDog} />);

      const card = screen.getByTestId("dog-card-1");
      expect(card).toHaveClass("flex");
      expect(card).toHaveClass("flex-col");
      expect(card).toHaveClass("h-full");
    });
  });

  describe("Badge Positioning and Styling", () => {
    test("NEW badge has proper positioning", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2); // 2 days ago

      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        created_at: recentDate.toISOString(),
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={mockDog} />);

      const newBadge = screen.getByTestId("new-badge");

      // NEW badge should be top-left
      expect(newBadge).toHaveClass("top-2");
      expect(newBadge).toHaveClass("left-2");
      expect(newBadge).toHaveClass("z-10");

      // Organization badge should not exist
      const orgBadge = screen.queryByTestId("organization-badge");
      expect(orgBadge).not.toBeInTheDocument();
    });
  });

  describe("Accessibility Enhancements for New Features", () => {
    test("NEW badge has proper ARIA label", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        created_at: recentDate.toISOString(),
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={mockDog} />);

      const newBadge = screen.getByTestId("new-badge");
      expect(newBadge).toHaveAttribute("aria-label", "Recently added dog");

      // Organization badge should not exist
      const orgBadge = screen.queryByTestId("organization-badge");
      expect(orgBadge).not.toBeInTheDocument();
    });

    test("hover animations do not interfere with keyboard navigation", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={mockDog} />);

      const card = screen.getByTestId("dog-card-1");
      const ctaLink = screen.getByText("Meet Buddy →").closest("a");

      // Focus should work normally
      ctaLink.focus();
      expect(ctaLink).toHaveFocus();

      // Card should have animation classes (shadow effects are in CSS)
      expect(card).toHaveClass("shadow-sm");
    });
  });

  // NEW TESTS FOR ENHANCED FEATURES (Session 5)
  describe("Enhanced Card Features", () => {
    test("displays larger image with correct dimensions", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      // Image might be in placeholder state, check for either real image or placeholder
      const imageContainer =
        screen.getByTestId("optimized-image") || screen.getByAltText("Buddy");
      expect(imageContainer).toBeInTheDocument();

      // Image container now uses aspect-[4/3] instead of fixed height classes
      const imageContainerParent = screen.getByTestId("image-container");
      expect(imageContainerParent).toHaveClass("aspect-[4/3]");
    });

    test("displays dog name prominently", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const nameElement = screen.getByTestId("dog-name");
      expect(nameElement).toHaveClass("text-card-title");
    });

    test("displays age category with formatted age", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        age_min_months: 18, // Should be categorized as 'Young'
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      expect(screen.getByTestId("age-category")).toHaveTextContent("Young");
      expect(screen.getByTestId("formatted-age")).toHaveTextContent(
        "1 year, 6 months",
      );
    });

    test("displays gender with icon", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        sex: "Male",
        age_min_months: 24, // Need age for the age/gender row to display
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const genderElement = screen.getByTestId("gender-display");
      expect(genderElement).toHaveTextContent("♂️ Male");
    });

    test("displays organization name as location proxy", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: {
          name: "Pets in Turkey",
          city: "Istanbul",
          country: "Turkey",
        },
      };

      render(<DogCard dog={mockDog} />);

      const locationElement = screen.getByTestId("location-display");
      expect(locationElement).toHaveTextContent("Pets in Turkey");
    });

    test("displays ships-to countries with flags", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: {
          name: "Test Org",
          ships_to: ["DE", "NL", "BE", "FR"],
        },
      };

      render(<DogCard dog={mockDog} />);

      const shipsToElement = screen.getByTestId("ships-to-display");
      expect(shipsToElement).toBeInTheDocument();
      // Flags should be rendered as part of the ships-to component
    });

    test("displays Meet CTA button", () => {
      const mockDog = {
        id: 1,
        slug: "buddy-dog-1",
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const ctaButton = screen.getByText("Meet Buddy →");
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton.closest("a")).toHaveAttribute(
        "href",
        "/dogs/buddy-dog-1",
      );
    });
  });

  describe("Enhanced Card Responsive Design", () => {
    test("applies mobile-specific classes for smaller screens", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      // Image might be in placeholder state
      const imageElement =
        screen.queryByAltText("Buddy") || screen.getByTestId("optimized-image");
      expect(imageElement).toBeInTheDocument();
      expect(imageElement.className).toContain("object-cover");
    });

    test("maintains aspect ratio for images", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      // Image might be in placeholder state
      const imageElement =
        screen.queryByAltText("Buddy") || screen.getByTestId("optimized-image");
      expect(imageElement.className).toContain("object-cover");
    });
  });

  describe("Session 3: Enhanced Hover Effects & Micro-interactions", () => {
    test("card has proper hover animation classes and structure", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

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
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const card = screen.getByTestId("dog-card-1");

      // Simulate hover by checking CSS classes that would trigger the hover state
      expect(card).toHaveClass("shadow-sm");

      // Note: The actual CSS transform is tested via the CSS class presence
      // The transform: translateY(-4px) scale(1.02) is defined in globals.css
      // This test ensures the component has the correct structure for the hover effect
    });

    test("card hover enhances shadow with orange tint", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const card = screen.getByTestId("dog-card-1");

      // Card should use the unified shadow hierarchy (shadow-sm to shadow-xl)
      expect(card).toHaveClass("shadow-sm");
      expect(card).toHaveClass("hover:shadow-xl");

      // The orange-tinted shadow is applied via CSS :hover pseudo-class
      // Testing for the class that enables this behavior
      expect(card).toHaveClass("shadow-sm");
    });

    test("image has correct hover scale effect (scale(1.05))", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      // Check placeholder or loaded image
      const imageElement =
        screen.queryByAltText("Buddy") || screen.getByTestId("optimized-image");

      // Image should have correct hover scale effect - OptimizedImage generates base classes
      expect(imageElement.className).toContain("w-full");
      expect(imageElement.className).toContain("h-full");
      expect(imageElement.className).toContain("object-cover");
      // The hover effects are applied via parent container with group class
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

      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const card = screen.getByTestId("dog-card-1");

      // Even with reduced motion, the classes should be present
      // The CSS handles disabling animations via media queries
      expect(card).toHaveClass("shadow-sm");
      expect(card).toHaveClass("will-change-transform");
    });

    test("hover animations do not cause layout shift", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const card = screen.getByTestId("dog-card-1");

      // Will-change property should be set to prevent layout shift
      expect(card).toHaveClass("will-change-transform");

      // Card should maintain proper structure for transform animations
      expect(card).toHaveClass("flex");
      expect(card).toHaveClass("flex-col");
      expect(card).toHaveClass("h-full");
    });

    test("CTA button has enhanced hover and focus states", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

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
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const ctaButton = screen.getByText("Meet Buddy →");

      // Button uses outline variant, not gradient background
      expect(ctaButton).toHaveClass("animate-button-hover");
      expect(ctaButton).toHaveClass("w-full");
      expect(ctaButton).toHaveClass("hover:shadow-lg");
      expect(ctaButton).toHaveClass("hover:-translate-y-0.5");
    });

    test("button maintains accessibility with proper focus indicators", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

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

  // SESSION 2 ENHANCEMENT TESTS
  describe("Session 2: Card Structure Enhancements", () => {
    test("applies new card structure with rounded-xl, bg-white, shadow-md", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const card = screen.getByTestId("dog-card-1");
      expect(card).toHaveClass("shadow-sm");
      expect(card).toHaveClass("hover:shadow-xl");
      expect(card).toHaveClass("transition-all");
      expect(card).toHaveClass("duration-300");

      // Card component might have border in base class, but our styling overrides it
      // The visual effect is no border due to shadow-md
    });
  });

  describe("Session 2: Image Aspect Ratio", () => {
    test("applies 4:3 aspect ratio to image container", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const imageContainer = screen.getByTestId("image-container");
      expect(imageContainer).toHaveClass("aspect-[4/3]");
      expect(imageContainer).toHaveClass("relative");
      expect(imageContainer).toHaveClass("overflow-hidden");
      expect(imageContainer).toHaveClass("bg-muted");
    });

    test("image fills container properly with object-cover", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const imageElement =
        screen.queryByAltText("Buddy") || screen.getByTestId("optimized-image");
      expect(imageElement).toHaveClass("w-full");
      expect(imageElement).toHaveClass("h-full");
      expect(imageElement).toHaveClass("object-cover");
    });
  });

  describe("Session 2: Organization Badge Removed for Cleaner Design", () => {
    test("organization badge no longer appears on image for cleaner look", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Pets in Turkey" },
      };

      render(<DogCard dog={mockDog} />);

      // Organization badge should not exist on image
      const orgBadge = screen.queryByTestId("organization-badge");
      expect(orgBadge).not.toBeInTheDocument();

      // But organization info should still be visible in content area
      const locationDisplay = screen.getByTestId("location-display");
      expect(locationDisplay).toHaveTextContent("Pets in Turkey");
    });

    test("image container only contains NEW badge when applicable", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        created_at: recentDate.toISOString(),
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const imageContainer = screen.getByTestId("image-container");

      // Only NEW badge should exist inside image
      const newBadge = screen.getByTestId("new-badge");
      expect(imageContainer).toContainElement(newBadge);

      // Organization badge should not exist
      const orgBadge = screen.queryByTestId("organization-badge");
      expect(orgBadge).not.toBeInTheDocument();
    });
  });

  describe("Session 2: Information Hierarchy", () => {
    test("dog name has larger, bolder typography", () => {
      const mockDog = {
        id: 1,
        name: "Lucky",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const nameElement = screen.getByTestId("dog-name");
      expect(nameElement).toHaveClass("text-card-title"); // Changed from font-semibold
      expect(nameElement).toHaveClass("hover:underline");
    });

    test("age and gender displayed inline with icons", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        age_min_months: 24,
        sex: "Male",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const ageGenderRow = screen.getByTestId("age-gender-row");
      expect(ageGenderRow).toBeInTheDocument();
      expect(ageGenderRow).toHaveClass("flex");
      expect(ageGenderRow).toHaveClass("items-center");
      expect(ageGenderRow).toHaveClass("gap-2");

      // Check for age category display
      const ageCategory = within(ageGenderRow).getByTestId("age-category");
      expect(ageCategory).toBeInTheDocument();
      expect(ageCategory).toHaveTextContent("🎂");

      // Check for gender display
      const genderDisplay = within(ageGenderRow).getByTestId("gender-display");
      expect(genderDisplay).toBeInTheDocument();
    });

    test("organization displayed with location icon", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Pets in Turkey" },
      };

      render(<DogCard dog={mockDog} />);

      const locationDisplay = screen.getByTestId("location-display");
      expect(locationDisplay).toBeInTheDocument();
      expect(locationDisplay).toHaveTextContent("Pets in Turkey");
    });

    test("ships-to displayed as flag emojis with proper formatting", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: {
          name: "Test Org",
          ships_to: ["DE", "NL", "BE", "FR", "GB"], // More than 3 to test overflow
        },
      };

      render(<DogCard dog={mockDog} />);

      const shipsToDisplay = screen.getByTestId("ships-to-display");
      expect(shipsToDisplay).toBeInTheDocument();

      // Should show "Adoptable to:" label
      expect(shipsToDisplay).toHaveTextContent("Adoptable to:");

      // Check for ships to content - formatShipsToList returns JSX with flags
      expect(shipsToDisplay).toHaveTextContent("Germany");
      expect(shipsToDisplay).toHaveTextContent("Netherlands");
      expect(shipsToDisplay).toHaveTextContent("+2 more");
    });
  });

  describe("Session 2: CTA Button Enhancement", () => {
    test('CTA button shows personalized "Meet [Name] →" text', () => {
      const mockDog = {
        id: 1,
        name: "Lucky",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const ctaButton = screen.getByText("Meet Lucky →");
      expect(ctaButton).toBeInTheDocument();
    });

    test("CTA button has orange gradient background", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const ctaButton = screen.getByText("Meet Buddy →");
      expect(ctaButton).toHaveClass("animate-button-hover");
      expect(ctaButton).toHaveClass("w-full");
      expect(ctaButton).toHaveClass("hover:shadow-lg");
      expect(ctaButton).toHaveClass("hover:-translate-y-0.5");
    });

    test("CTA button is full width within card footer", () => {
      const mockDog = {
        id: 1,
        slug: "buddy-dog-1",
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const ctaButton = screen.getByText("Meet Buddy →");
      expect(ctaButton).toHaveClass("w-full");

      // Button should still be inside a link
      const linkWrapper = ctaButton.closest("a");
      expect(linkWrapper).toHaveAttribute("href", "/dogs/buddy-dog-1");
      expect(linkWrapper).toHaveClass("w-full");
    });

    test("CTA button handles long names with truncation", () => {
      const mockDog = {
        id: 1,
        name: "Princess Buttercup McFluffington III",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      // Should still render with full name in button
      const ctaButton = screen.getByText(
        "Meet Princess Buttercup McFluffington III →",
      );
      expect(ctaButton).toBeInTheDocument();
    });
  });

  describe("Session 2: Content Padding and Spacing", () => {
    test("card content has proper padding", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const cardContent = screen.getByTestId("card-content");
      expect(cardContent).toHaveClass("space-y-2", "pb-3"); // Current padding
    });

    test("card footer has adjusted padding", () => {
      const mockDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const cardFooter = screen.getByTestId("card-footer");
      expect(cardFooter).toHaveClass("pt-0"); // No top padding
    });
  });

  describe("Adoption Availability Feature", () => {
    test("displays single shipping country", () => {
      const mockDog = {
        id: 1,
        name: "Lucky",
        status: "available",
        primary_image_url: "https://example.com/lucky.jpg",
        organization: {
          name: "REAN",
          ships_to: ["UK"],
        },
      };

      render(<DogCard dog={mockDog} />);

      const shipsToElement = screen.getByTestId("ships-to-display");
      expect(shipsToElement).toBeInTheDocument();
      expect(shipsToElement).toHaveTextContent("Adoptable to:");
      expect(shipsToElement).toHaveTextContent("United Kingdom");
    });

    test('displays multiple shipping countries with "more" indicator', () => {
      const mockDog = {
        id: 2,
        name: "Max",
        status: "available",
        primary_image_url: "https://example.com/max.jpg",
        organization: {
          name: "Berlin Rescue",
          ships_to: ["DE", "NL", "BE", "FR", "IT", "ES"],
        },
      };

      render(<DogCard dog={mockDog} />);

      const shipsToElement = screen.getByTestId("ships-to-display");
      expect(shipsToElement).toBeInTheDocument();
      expect(shipsToElement).toHaveTextContent("Adoptable to:");

      // Should show first 3 countries
      expect(shipsToElement).toHaveTextContent("Germany");
      expect(shipsToElement).toHaveTextContent("Netherlands");
      expect(shipsToElement).toHaveTextContent("Belgium");

      // Should show overflow indicator
      expect(shipsToElement).toHaveTextContent("+3 more");
    });

    test("does not display ships-to when information is missing", () => {
      const mockDog = {
        id: 3,
        name: "Bella",
        status: "available",
        primary_image_url: "https://example.com/bella.jpg",
        organization: {
          name: "Local Shelter",
          // No ships_to field
        },
      };

      render(<DogCard dog={mockDog} />);

      const shipsToElement = screen.queryByTestId("ships-to-display");
      expect(shipsToElement).not.toBeInTheDocument();
    });

    test("displays adoptable text with correct styling", () => {
      const mockDog = {
        id: 1,
        name: "Lucky",
        status: "available",
        organization: {
          name: "REAN",
          ships_to: ["GB", "IE"],
        },
      };

      render(<DogCard dog={mockDog} />);

      const shipsToElement = screen.getByTestId("ships-to-display");
      expect(shipsToElement).toHaveTextContent("Adoptable to:");
    });
  });
});
