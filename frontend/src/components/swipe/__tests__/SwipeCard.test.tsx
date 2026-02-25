import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SwipeCard } from "../SwipeCard";
import { FavoritesProvider } from "../../../contexts/FavoritesContext";
import { ToastProvider } from "../../../contexts/ToastContext";

jest.mock("../../ui/ShareButton", () => {
  return function MockShareButton({ url, title, text, compact }: { url?: string; title?: string; text?: string; compact?: boolean }) {
    return (
      <button
        data-testid="share-button"
        data-url={url}
        data-title={title}
        data-text={text}
        data-compact={compact ? "true" : "false"}
        aria-label="Share"
      >
        Share
      </button>
    );
  };
});

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <ToastProvider>
      <FavoritesProvider>{component}</FavoritesProvider>
    </ToastProvider>,
  );
};

describe("SwipeCard", () => {
  const mockDog = {
    id: 1,
    name: "Buddy",
    breed: "Golden Retriever",
    age: "2 years",
    primary_image_url: "https://example.com/buddy.jpg",
    organization: { name: "Happy Paws Rescue" },
    location: "San Francisco, CA",
    slug: "buddy-golden",
    description: "A friendly and energetic companion",
    dog_profiler_data: {
      tagline: "Buddy: Your next adventure companion!",
      unique_quirk: "Loves to play fetch for hours",
      personality_traits: ["Playful", "Loyal", "Gentle"],
      favorite_activities: ["fetch", "swimming"],
      quality_score: 90,
    },
    created_at: new Date().toISOString(),
  };

  it("should display dog name and tagline", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    expect(screen.getByText("Buddy")).toBeInTheDocument();
    // Shows enriched tagline
    expect(
      screen.getByText(/Buddy: Your next adventure companion!/),
    ).toBeInTheDocument();
  });

  it("should show personality traits", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    expect(screen.getByText("Playful")).toBeInTheDocument();
    expect(screen.getByText("Loyal")).toBeInTheDocument();
    expect(screen.getByText("Gentle")).toBeInTheDocument();
  });

  it("should have heart and share action buttons", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    expect(screen.getByLabelText("Add to favorites")).toBeInTheDocument();
    expect(screen.getByLabelText("Share")).toBeInTheDocument();
  });

  it("should not display energy level when dog lacks energy_level data", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    expect(screen.queryByText("Energy:")).not.toBeInTheDocument();
  });

  it("should not display energy level (removed from card in redesign, preserved in detail modal)", () => {
    const dogWithEnergy = {
      ...mockDog,
      dog_profiler_data: {
        ...mockDog.dog_profiler_data,
        energy_level: "high" as const,
      },
    };
    renderWithProvider(<SwipeCard dog={dogWithEnergy} />);

    expect(screen.queryByText("Energy:")).not.toBeInTheDocument();
  });

  it("should show unique quirk", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    expect(screen.getByText(/Loves to play fetch/)).toBeInTheDocument();
    expect(screen.getByText(/✨/)).toBeInTheDocument();
  });

  it("should show NEW badge for recent dogs", () => {
    const newDog = {
      ...mockDog,
      created_at: new Date().toISOString(),
    };

    renderWithProvider(<SwipeCard dog={newDog} />);

    expect(screen.getByText("NEW")).toBeInTheDocument();
  });

  it("should not show NEW badge for dogs older than 7 days", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 8);
    const oldDog = {
      ...mockDog,
      created_at: oldDate.toISOString(),
    };

    renderWithProvider(<SwipeCard dog={oldDog} />);

    expect(screen.queryByText("NEW")).not.toBeInTheDocument();
  });

  it("should not display organization and location (removed in redesign)", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    expect(screen.queryByText(/Happy Paws Rescue/)).not.toBeInTheDocument();
    expect(screen.queryByText(/San Francisco, CA/)).not.toBeInTheDocument();
  });

  it("should show placeholder when no image provided", () => {
    const dogWithoutImage = {
      ...mockDog,
      primary_image_url: undefined,
      main_image: undefined,
    };

    renderWithProvider(<SwipeCard dog={dogWithoutImage} />);

    // The FallbackImage component will render a placeholder
    // Check for the fallback image or placeholder element
    const container = screen.getByTestId("image-container");
    expect(container).toBeInTheDocument();

    // The FallbackImage should still render an img element with fallback src
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/placeholder_dog.svg");
  });

  it("should handle missing optional fields gracefully", () => {
    const minimalDog = {
      id: 2,
      name: "Max",
      slug: "max",
    };

    renderWithProvider(<SwipeCard dog={minimalDog} />);

    expect(screen.getByText("Max")).toBeInTheDocument();
    expect(screen.queryByText("Energy:")).not.toBeInTheDocument();
    expect(screen.queryByText("🦴")).not.toBeInTheDocument();
  });

  it("should apply proper styling with rounded corners and warm shadow", () => {
    const { container } = renderWithProvider(<SwipeCard dog={mockDog} />);

    const card = container.querySelector(".rounded-2xl");
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass("shadow-[var(--shadow-orange-lg)]");
  });

  it("should have 3:4 portrait aspect ratio for image-hero layout", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    const imageContainer = screen.getByTestId("image-container");
    expect(imageContainer).toHaveClass("aspect-[3/4]");
  });

  describe("CLS Prevention", () => {
    it("should render image container with min-height for layout stability", () => {
      renderWithProvider(<SwipeCard dog={mockDog} />);

      const imageContainer = screen.getByTestId("image-container");
      expect(imageContainer).toHaveClass("min-h-[280px]");
    });

    it("should render content area with flex layout", () => {
      renderWithProvider(<SwipeCard dog={mockDog} />);

      const imageContainer = screen.getByTestId("image-container");
      const contentArea = imageContainer.nextElementSibling;
      expect(contentArea).toHaveClass("flex-1");
      expect(contentArea).toHaveClass("flex");
    });

    it("should overlay name on image via gradient when no age/breed info", () => {
      const minimalDog = {
        id: 2,
        name: "Max",
        slug: "max",
      };
      renderWithProvider(<SwipeCard dog={minimalDog} />);

      // Name is now overlaid on the image gradient, not in the content section
      const imageContainer = screen.getByTestId("image-container");
      const nameHeading = imageContainer.querySelector("h3");
      expect(nameHeading).toBeInTheDocument();
      expect(nameHeading).toHaveTextContent("Max");
    });
  });

  it("should have accessible touch target sizes for favorite button", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    const favoriteButton = screen.getByLabelText("Add to favorites");

    expect(favoriteButton).toHaveClass("w-12");
    expect(favoriteButton).toHaveClass("h-12");
    expect(favoriteButton).toHaveClass("sm:w-14");
    expect(favoriteButton).toHaveClass("sm:h-14");
  });

  it("should have aria-pressed attribute on favorite button", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    const favoriteButton = screen.getByLabelText("Add to favorites");
    expect(favoriteButton).toHaveAttribute("aria-pressed", "false");
  });

  describe("Share URL construction", () => {
    it("should pass slug-based URL to ShareButton", () => {
      renderWithProvider(<SwipeCard dog={mockDog} />);

      const shareButton = screen.getByTestId("share-button");
      const url = shareButton.getAttribute("data-url");
      expect(url).toContain("/dogs/buddy-golden");
      expect(url).not.toMatch(/\/dog\/\d+/);
    });

    it("should fall back to /dogs when dog has no slug", () => {
      const dogWithoutSlug = {
        id: 3,
        name: "Rex",
      };

      renderWithProvider(<SwipeCard dog={dogWithoutSlug} />);

      const shareButton = screen.getByTestId("share-button");
      const url = shareButton.getAttribute("data-url");
      expect(url).toMatch(/\/dogs$/);
    });
  });
});
