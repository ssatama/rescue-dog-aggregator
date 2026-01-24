import React from "react";
import { render, screen, within } from "../../../../test-utils";
import DogCard from "../../DogCardOptimized";
import {
  mockDog,
  incompleteDataDog,
  dogWithUnknownBreed,
  recentDog,
  dogWithShipping,
  dogWithCompatibility,
  dogWithTraits,
  dogWithExperience,
} from "../../dogCardTestHelpers";

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

describe("DogCard Rendering", () => {
  test("renders dog card with correct information", () => {
    render(<DogCard dog={mockDog} />);

    // Check basic information
    expect(screen.getByText("Buddy")).toBeInTheDocument();

    // Check that it uses standardized breed
    expect(screen.getByText("Labrador Retriever")).toBeInTheDocument();

    // Breed group should NOT be displayed anymore (fixed per requirement)
    expect(screen.queryByText("Test Group")).not.toBeInTheDocument();

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
    render(<DogCard dog={incompleteDataDog} />);

    // Should still render with fallback values
    expect(screen.getByText("Max")).toBeInTheDocument();
    // Should not show breed section when missing
    expect(screen.queryByText("Unknown Breed")).not.toBeInTheDocument();
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
    // Check button text
    expect(screen.getByText("Meet Max →")).toBeInTheDocument();
  });

  test("hides breed when Unknown", () => {
    render(<DogCard dog={dogWithUnknownBreed} />);

    // Should render name
    expect(screen.getByText("Luna")).toBeInTheDocument();
    // Should not show breed line when it's Unknown
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
    // Should still have the meet button
    expect(screen.getByText("Meet Luna →")).toBeInTheDocument();
  });

  describe("NEW Badge for Recent Dogs", () => {
    test("shows NEW badge for dogs added within last 7 days", () => {
      const recentDogData = recentDog(6);
      render(<DogCard dog={recentDogData} />);

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
      const oldDogData = recentDog(8);
      render(<DogCard dog={oldDogData} />);

      const newBadge = screen.queryByTestId("new-badge");
      expect(newBadge).not.toBeInTheDocument();
    });

    test("does not show NEW badge when created_at is missing", () => {
      const dogNoDate = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={dogNoDate} />);

      const newBadge = screen.queryByTestId("new-badge");
      expect(newBadge).not.toBeInTheDocument();
    });

    test("handles invalid created_at dates gracefully", () => {
      const dogInvalidDate = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        created_at: "invalid-date",
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={dogInvalidDate} />);

      const newBadge = screen.queryByTestId("new-badge");
      expect(newBadge).not.toBeInTheDocument();
    });
  });

  describe("Text Truncation and Consistent Heights", () => {
    test("truncates long dog names", () => {
      const longNameDog = {
        id: 1,
        name: "This is a very long dog name that should be truncated for consistent card heights",
        status: "available",
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={longNameDog} />);

      const nameElement = screen.getByTestId("dog-name");
      expect(nameElement).toHaveClass("truncate");
    });

    test("truncates long breed names", () => {
      const longBreedDog = {
        id: 1,
        name: "Buddy",
        standardized_breed:
          "This is a very long breed name that should be truncated",
        status: "available",
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={longBreedDog} />);

      const breedElement = screen.getByTestId("dog-breed");
      expect(breedElement).toHaveClass("truncate");
    });

    test("applies consistent height classes to card", () => {
      const simpleDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org", city: "Test City", country: "TC" },
      };

      render(<DogCard dog={simpleDog} />);

      const card = screen.getByTestId("dog-card-1");
      expect(card).toHaveClass("flex");
      expect(card).toHaveClass("flex-col");
      expect(card).toHaveClass("h-full");
    });
  });

  describe("Badge Positioning and Styling", () => {
    test("NEW badge has proper positioning", () => {
      const recentDogData = recentDog(2);
      render(<DogCard dog={recentDogData} />);

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

  describe("Enhanced Card Features", () => {
    test("displays larger image with correct dimensions", () => {
      const imageDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={imageDog} />);

      // Image might be in placeholder state, check for either real image or placeholder
      const imageContainer =
        screen.getByTestId("optimized-image") || screen.getByAltText("Buddy");
      expect(imageContainer).toBeInTheDocument();

      // Image container now uses aspect-[4/3] instead of fixed height classes
      const imageContainerParent = screen.getByTestId("image-container");
      expect(imageContainerParent).toHaveClass("aspect-[4/3]");
    });

    test("displays dog name prominently", () => {
      const nameDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={nameDog} />);

      const nameElement = screen.getByTestId("dog-name");
      expect(nameElement).toHaveClass("text-card-title");
    });

    test("displays age category with formatted age", () => {
      const ageDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        age_min_months: 18, // Should be categorized as 'Young'
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={ageDog} />);

      expect(screen.getByTestId("age-category")).toHaveTextContent("Young");
    });

    test("displays gender with icon", () => {
      const genderDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        sex: "Male",
        age_min_months: 24, // Need age for the age/gender row to display
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={genderDog} />);

      const genderElement = screen.getByTestId("gender-display");
      expect(genderElement).toHaveTextContent("♂️ Male");
    });

    test("displays organization name as location proxy", () => {
      const orgDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: {
          name: "Pets in Turkey",
          city: "Istanbul",
          country: "Turkey",
        },
      };

      render(<DogCard dog={orgDog} />);

      const locationElement = screen.getByTestId("location-display");
      expect(locationElement).toHaveTextContent("Pets in Turkey");
    });

    test("displays ships-to countries with flags", () => {
      render(<DogCard dog={dogWithShipping} />);

      const shipsToElement = screen.getByTestId("ships-to-display");
      expect(shipsToElement).toBeInTheDocument();
      // Flags should be rendered as part of the ships-to component
    });

    test("displays Meet CTA button", () => {
      const ctaDog = {
        id: 1,
        slug: "buddy-dog-1",
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={ctaDog} />);

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
      const mobileDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mobileDog} />);

      // Image might be in placeholder state
      const imageElement =
        screen.queryByAltText("Buddy") || screen.getByTestId("optimized-image");
      expect(imageElement).toBeInTheDocument();
      expect(imageElement.className).toContain("object-cover");
    });

    test("maintains aspect ratio for images", () => {
      const aspectDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={aspectDog} />);

      // Image might be in placeholder state
      const imageElement =
        screen.queryByAltText("Buddy") || screen.getByTestId("optimized-image");
      expect(imageElement.className).toContain("object-cover");
    });
  });

  describe("Card Structure Enhancements", () => {
    test("applies new card structure with rounded-xl, bg-white, shadow-md", () => {
      const structureDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={structureDog} />);

      const card = screen.getByTestId("dog-card-1");
      expect(card).toHaveClass("shadow-sm");
      expect(card).toHaveClass("hover:shadow-xl");
      expect(card).toHaveClass("transition-[transform,box-shadow]");
      expect(card).toHaveClass("duration-300");
    });
  });

  describe("Image Aspect Ratio", () => {
    test("applies 4:3 aspect ratio to image container", () => {
      const aspectRatioDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={aspectRatioDog} />);

      const imageContainer = screen.getByTestId("image-container");
      expect(imageContainer).toHaveClass("aspect-[4/3]");
      expect(imageContainer).toHaveClass("relative");
      expect(imageContainer).toHaveClass("overflow-hidden");
      expect(imageContainer).toHaveClass("bg-muted");
    });

    test("image fills container properly with object-cover", () => {
      const coverDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={coverDog} />);

      const imageElement =
        screen.queryByAltText("Buddy") || screen.getByTestId("optimized-image");
      expect(imageElement).toHaveClass("w-full");
      expect(imageElement).toHaveClass("h-full");
      expect(imageElement).toHaveClass("object-cover");
    });
  });

  describe("Organization Badge Removed for Cleaner Design", () => {
    test("organization badge no longer appears on image for cleaner look", () => {
      const orgBadgeDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        primary_image_url: "https://example.com/image.jpg",
        organization: { name: "Pets in Turkey" },
      };

      render(<DogCard dog={orgBadgeDog} />);

      // Organization badge should not exist on image
      const orgBadge = screen.queryByTestId("organization-badge");
      expect(orgBadge).not.toBeInTheDocument();

      // But organization info should still be visible in content area
      const locationDisplay = screen.getByTestId("location-display");
      expect(locationDisplay).toHaveTextContent("Pets in Turkey");
    });

    test("image container only contains NEW badge when applicable", () => {
      const badgeTestDog = recentDog(2);

      render(<DogCard dog={badgeTestDog} />);

      const imageContainer = screen.getByTestId("image-container");

      // Only NEW badge should exist inside image
      const newBadge = screen.getByTestId("new-badge");
      expect(imageContainer).toContainElement(newBadge);

      // Organization badge should not exist
      const orgBadge = screen.queryByTestId("organization-badge");
      expect(orgBadge).not.toBeInTheDocument();
    });
  });

  describe("Information Hierarchy", () => {
    test("dog name has larger, bolder typography", () => {
      const hierarchyDog = {
        id: 1,
        name: "Lucky",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={hierarchyDog} />);

      const nameElement = screen.getByTestId("dog-name");
      expect(nameElement).toHaveClass("text-card-title");
      expect(nameElement).toHaveClass("hover:underline");
    });

    test("age and gender displayed inline with icons", () => {
      const ageGenderDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        age_min_months: 24,
        sex: "Male",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={ageGenderDog} />);

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
      const locationDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Pets in Turkey" },
      };

      render(<DogCard dog={locationDog} />);

      const locationDisplay = screen.getByTestId("location-display");
      expect(locationDisplay).toBeInTheDocument();
      expect(locationDisplay).toHaveTextContent("Pets in Turkey");
    });

    test("ships-to displayed as flag emojis with proper formatting", () => {
      const shipsToMoreDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: {
          name: "Test Org",
          ships_to: ["DE", "NL", "BE", "FR", "GB"], // More than 3 to test overflow
        },
      };

      render(<DogCard dog={shipsToMoreDog} />);

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

  describe("Content Padding and Spacing", () => {
    test("card content has proper padding", () => {
      const paddingDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={paddingDog} />);

      const cardContent = screen.getByTestId("card-content");
      expect(cardContent).toHaveClass("space-y-2", "pb-3");
    });

    test("card footer has adjusted padding", () => {
      const footerDog = {
        id: 1,
        name: "Buddy",
        status: "available",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={footerDog} />);

      const cardFooter = screen.getByTestId("card-footer");
      expect(cardFooter).toHaveClass("pt-0");
    });
  });

  describe("Adoption Availability Feature", () => {
    test("displays single shipping country", () => {
      const singleShipDog = {
        id: 1,
        name: "Lucky",
        status: "available",
        primary_image_url: "https://example.com/lucky.jpg",
        organization: {
          name: "REAN",
          ships_to: ["UK"],
        },
      };

      render(<DogCard dog={singleShipDog} />);

      const shipsToElement = screen.getByTestId("ships-to-display");
      expect(shipsToElement).toBeInTheDocument();
      expect(shipsToElement).toHaveTextContent("Adoptable to:");
      expect(shipsToElement).toHaveTextContent("United Kingdom");
    });

    test('displays multiple shipping countries with "more" indicator', () => {
      const multiShipDog = {
        id: 2,
        name: "Max",
        status: "available",
        primary_image_url: "https://example.com/max.jpg",
        organization: {
          name: "Berlin Rescue",
          ships_to: ["DE", "NL", "BE", "FR", "IT", "ES"],
        },
      };

      render(<DogCard dog={multiShipDog} />);

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
      const noShipDog = {
        id: 3,
        name: "Bella",
        status: "available",
        primary_image_url: "https://example.com/bella.jpg",
        organization: {
          name: "Local Shelter",
        },
      };

      render(<DogCard dog={noShipDog} />);

      // Container exists for CLS prevention but should have no content
      const shipsToElement = screen.queryByTestId("ships-to-display");
      expect(shipsToElement).toBeInTheDocument();
      expect(shipsToElement).toBeEmptyDOMElement();
    });

    test("displays adoptable text with correct styling", () => {
      const adoptableTextDog = {
        id: 1,
        name: "Lucky",
        status: "available",
        organization: {
          name: "REAN",
          ships_to: ["GB", "IE"],
        },
      };

      render(<DogCard dog={adoptableTextDog} />);

      const shipsToElement = screen.getByTestId("ships-to-display");
      expect(shipsToElement).toHaveTextContent("Adoptable to:");
    });
  });

  describe("Uncertainty Indicators", () => {
    test("handles age ranges with estimation indicator", () => {
      const ageRangeDog = {
        id: 1,
        name: "Buddy",
        age_min_months: 60, // 5 years
        age_max_months: 84, // 7 years
        status: "available",
      };

      render(<DogCard dog={ageRangeDog} />);

      // Should still display age category for ranges
      expect(screen.getByTestId("age-category")).toHaveTextContent("Adult");
    });

    test("displays young category for 18 month old dog", () => {
      const youngDog = {
        id: 2,
        name: "Luna",
        age_min_months: 18, // 18 months should be Young
        status: "available",
      };

      render(<DogCard dog={youngDog} />);

      // Should display Young category for 18 month old dog
      expect(screen.getByTestId("age-category")).toHaveTextContent("Young");
    });

    test("handles exact age without estimation", () => {
      const exactAgeDog = {
        id: 3,
        name: "Max",
        age_min_months: 24, // Exactly 2 years
        status: "available",
      };

      render(<DogCard dog={exactAgeDog} />);

      // Should display Young category for 2 year old dog (24 months is still Young)
      expect(screen.getByTestId("age-category")).toHaveTextContent("Young");
    });
  });

  describe("Experience Level Display", () => {
    test("displays specific experience requirement", () => {
      render(<DogCard dog={dogWithExperience} />);

      // Check if experience display exists (using testid)
      const experienceDisplay = screen.getByTestId("experience-display");
      expect(experienceDisplay).toBeInTheDocument();
      expect(experienceDisplay).toHaveTextContent("Some experience helpful");
    });

    test("displays first-time owner friendly message", () => {
      const firstTimeDog = {
        id: 2,
        name: "Luna",
        status: "available",
        dog_profiler_data: {
          experience_level: "first_time_ok",
        },
      };

      render(<DogCard dog={firstTimeDog} />);

      const experienceDisplay = screen.getByTestId("experience-display");
      expect(experienceDisplay).toHaveTextContent(
        "Great for first-time owners",
      );
    });

    test("does not display experience level when not available", () => {
      const noExpDog = {
        id: 3,
        name: "Max",
        status: "available",
      };

      render(<DogCard dog={noExpDog} />);

      expect(screen.queryByText(/experience/)).not.toBeInTheDocument();
    });
  });

  describe("Compatibility Indicators", () => {
    test("displays compatibility status with icons", () => {
      render(<DogCard dog={dogWithCompatibility} />);

      expect(screen.getByText("Good")).toBeInTheDocument();
      expect(screen.getByText("Maybe")).toBeInTheDocument();
      expect(screen.getByText("No")).toBeInTheDocument();
    });

    test("displays 'Not yet assessed' for unknown compatibility", () => {
      const noCompatDog = {
        id: 2,
        name: "Luna",
        status: "available",
      };

      render(<DogCard dog={noCompatDog} />);

      // Should show "Not yet assessed" three times (dogs, cats, children)
      expect(screen.getAllByText("Not yet assessed")).toHaveLength(3);
    });
  });

  describe("Special Traits Display", () => {
    test("displays personality traits with hover titles", () => {
      render(<DogCard dog={dogWithTraits} />);

      // Should show first 3 traits
      expect(screen.getByText("Friendly")).toBeInTheDocument();
      expect(screen.getByText("Energetic")).toBeInTheDocument();
      expect(screen.getByText("Loyal")).toBeInTheDocument();

      // Should not show 4th and 5th traits (limited to 3)
      expect(screen.queryByText("Smart")).not.toBeInTheDocument();
      expect(screen.queryByText("Playful")).not.toBeInTheDocument();

      // Check hover titles
      const friendlyTrait = screen.getByText("Friendly");
      expect(friendlyTrait).toHaveAttribute("title", "Friendly");
    });

    test("does not display traits section when no traits available", () => {
      const noTraitsDog = {
        id: 2,
        name: "Luna",
        status: "available",
      };

      render(<DogCard dog={noTraitsDog} />);

      // Container exists for CLS prevention but should have no content
      const traitsElement = screen.queryByTestId("traits-display");
      expect(traitsElement).toBeInTheDocument();
      expect(traitsElement).toBeEmptyDOMElement();
    });
  });
});
