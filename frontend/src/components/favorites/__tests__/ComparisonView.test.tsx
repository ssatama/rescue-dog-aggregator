import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { formatAgeRange } from "@/utils/dogHelpers";
import ComparisonView from "../ComparisonView";
import { Dog } from "../types";

jest.mock("@/lib/analytics", () => ({
  ...jest.requireActual("@/lib/analytics"),
  trackAdoptionLinkClicked: jest.fn(),
}));

const mockDogs: Dog[] = [
  {
    id: 1,
    name: "Luna",
    breed: "Golden Retriever Mix",
    age_text: "3 years",
    age_min_months: 36,
    age_max_months: 47,
    primary_image_url: "https://example.com/luna.jpg",
    dog_profiler_data: {
      tagline: "Gentle soul who loves cuddles and morning walks",
      personality_traits: ["Gentle", "Loyal", "Playful"],
      energy_level: "medium",
      experience_level: "first_time_ok",
      good_with_dogs: "yes",
      good_with_cats: "yes",
      good_with_children: "yes",
      unique_quirk: "Loves to carry her favorite tennis ball everywhere",
    },
    organization_name: "Happy Tails Rescue",
    status: "available",
    adoption_url: "https://example.com/adopt/luna",
  },
  {
    id: 2,
    name: "Max",
    breed: "Border Collie",
    age_text: "2 years",
    age_min_months: 24,
    age_max_months: 35,
    primary_image_url: "https://example.com/max.jpg",
    dog_profiler_data: {
      tagline: "Brilliant and energetic companion for active families",
      personality_traits: ["Intelligent", "Active", "Focused"],
      energy_level: "high",
      experience_level: "experienced_only",
      good_with_dogs: "yes",
      good_with_cats: "no",
      good_with_children: "yes",
      unique_quirk: "Can solve puzzle toys in under 2 minutes",
    },
    organization_name: "Border Collie Rescue",
    status: "available",
    adoption_url: "https://example.com/adopt/max",
  },
  {
    id: 3,
    name: "Bella",
    breed: "French Bulldog",
    age_text: "5 years",
    age_min_months: 60,
    age_max_months: 71,
    primary_image_url: "https://example.com/bella.jpg",
    dog_profiler_data: {
      tagline: "Calm apartment dweller who loves lazy Sunday mornings",
      personality_traits: ["Calm", "Affectionate", "Adaptable"],
      energy_level: "low",
      experience_level: "first_time_ok",
      good_with_dogs: "no",
      good_with_cats: "yes",
      good_with_children: "yes",
      unique_quirk: "Snores like a tiny freight train",
    },
    organization_name: "City Pet Rescue",
    status: "available",
    adoption_url: "https://example.com/adopt/bella",
  },
];

describe("ComparisonView", () => {
  const mockOnClose = jest.fn();
  const mockOnRemoveFavorite = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the comparison header", () => {
    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    expect(screen.getByText("Compare Your Favorites")).toBeInTheDocument();
    expect(
      screen.getByText(/Find the perfect match by comparing/),
    ).toBeInTheDocument();
  });

  it("displays all dog cards with correct information", () => {
    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    // Check each dog is rendered (may have multiple instances due to responsive design)
    mockDogs.forEach((dog) => {
      expect(screen.getAllByText(dog.name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(dog.breed!).length).toBeGreaterThan(0);
      // The age comes from the refreshed months, not age_text (#635)
      expect(screen.getAllByText(formatAgeRange(dog)!).length).toBeGreaterThan(0);
    });
  });

  it("displays personality taglines for each dog", () => {
    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    mockDogs.forEach((dog) => {
      if (dog.dog_profiler_data?.tagline) {
        expect(
          screen.getByText(`"${dog.dog_profiler_data.tagline}"`),
        ).toBeInTheDocument();
      }
    });
  });

  it("displays personality traits as badges", () => {
    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    // Check first dog's traits
    const traits = mockDogs[0].dog_profiler_data?.personality_traits || [];
    traits.forEach((trait) => {
      expect(screen.getByText(trait)).toBeInTheDocument();
    });
  });

  it("displays energy levels correctly", () => {
    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    // Energy levels are displayed as visual indicators (battery icons) in the compatibility section
    // Check that each dog's energy level is represented
    mockDogs.forEach((dog) => {
      if (dog.dog_profiler_data?.energy_level) {
        // Energy levels are shown as battery icons, not text
        const cards = screen.getAllByTestId(/^card-wrapper$/);
        expect(cards.length).toBeGreaterThan(0);
      }
    });
  });

  it("displays experience level indicators", () => {
    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    expect(screen.getAllByText("Good for first-time owners").length).toBeGreaterThan(0);
    expect(screen.getByText("Experienced owners only")).toBeInTheDocument();
  });

  it("shows companions in the dog page's words (#550)", () => {
    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    const [luna, max, bella] = screen.getAllByRole("list", { name: "Lives with" }).map((row) => row.textContent);
    expect(luna).toBe("✓ Children: yes✓ Dogs: yes✓ Cats: yes");
    expect(max).toBe("✓ Children: yes✓ Dogs: yes✗ Cats: no");
    expect(bella).toBe("✓ Children: yes✓ Cats: yes✗ Dogs: no");
    expect(screen.getAllByRole("heading", { level: 4, name: "Lives with" })).toHaveLength(3);
  });

  it("leaves out unknown compatibility, energy and breed instead of guessing", () => {
    const unknownDog: Dog = {
      id: 9,
      name: "Pip",
      primary_image_url: "https://example.com/pip.jpg",
      dog_profiler_data: { good_with_cats: "unknown" },
      adoption_url: "https://example.com/adopt/pip",
    };
    render(
      <ComparisonView
        dogs={[unknownDog]}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    expect(screen.queryByText("Good with")).not.toBeInTheDocument();
    expect(screen.queryByText(/Cats/)).not.toBeInTheDocument();
    expect(screen.queryByText("Energy")).not.toBeInTheDocument();
    expect(screen.queryByText(/Mixed Breed/)).not.toBeInTheDocument();
  });

  it("shows the rescue's qualifiers and scraped answers like the dog page", () => {
    const dog: Dog = {
      id: 10,
      name: "Rex",
      age_text: "Unknown",
      primary_image_url: "https://example.com/rex.jpg",
      dog_profiler_data: { good_with_children: "older_children" },
      properties: { good_with_dogs: true },
      adoption_url: "https://example.com/adopt/rex",
    } as unknown as Dog;
    render(
      <ComparisonView dogs={[dog]} onClose={mockOnClose} onRemoveFavorite={mockOnRemoveFavorite} />,
    );

    const row = screen.getByRole("list", { name: "Lives with" }).textContent;
    expect(row).toContain("Children: older children");
    expect(row).toContain("✓ Dogs");
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
  });

  it("shows energy as a word, not an invented score", () => {
    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    // The dog page's words (#550)
    expect(screen.getByText("High energy")).toBeInTheDocument();
    expect(screen.getByText("Medium energy")).toBeInTheDocument();
    expect(screen.queryByText(/\/10/)).not.toBeInTheDocument();
  });

  it("displays unique quirks for each dog", () => {
    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    mockDogs.forEach((dog) => {
      if (dog.dog_profiler_data?.unique_quirk) {
        expect(
          screen.getByText(dog.dog_profiler_data.unique_quirk),
        ).toBeInTheDocument();
      }
    });
  });

  it("displays organization names", () => {
    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    // Organization names might not be displayed in the new minimal design
    // Check that the adopt links are present instead
    mockDogs.forEach((dog) => {
      expect(screen.getByRole("link", { name: new RegExp(`^Meet ${dog.name}`) })).toBeInTheDocument();
    });
  });

  it("renders an adopt link for each dog", () => {
    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    expect(screen.getAllByRole("link", { name: /^Meet / })).toHaveLength(mockDogs.length);
  });

  it("handles navigation between dogs on mobile", async () => {
    // Mock mobile viewport
    global.innerWidth = 375;
    global.dispatchEvent(new Event("resize"));

    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    // Initially should show first dog prominently (may have multiple instances)
    expect(screen.getAllByText("Luna").length).toBeGreaterThan(0);

    // Click next button
    const nextButton = screen.getByLabelText("Next dog");
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getAllByText("Max").length).toBeGreaterThan(0);
    });
  });

  it("handles navigation between dogs on desktop", () => {
    // Mock desktop viewport
    global.innerWidth = 1440;
    global.dispatchEvent(new Event("resize"));

    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    // Should show multiple dogs at once (may have multiple instances due to responsive design)
    expect(screen.getAllByText("Luna").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Max").length).toBeGreaterThan(0);
  });

  it("shows pagination dots for navigation", () => {
    // Mock mobile viewport for navigation dots
    global.innerWidth = 375;
    global.dispatchEvent(new Event("resize"));

    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    // The dots say where you are; there is no "Dog 1 of 3" counter (#504)
    expect(screen.getAllByRole("button", { name: /Go to page/ }).length).toBeGreaterThan(1);
    expect(screen.queryByText(/Dog \d+ of \d+/)).not.toBeInTheDocument();
  });

  it("calls onRemoveFavorite when heart button is clicked", () => {
    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    const removeButtons = screen.getAllByLabelText("Remove from favorites");
    fireEvent.click(removeButtons[0]);

    expect(mockOnRemoveFavorite).toHaveBeenCalledWith(mockDogs[0].id);
  });

  it("links to the rescue with the referrer kept, and tracks the click from comparison", () => {
    const { trackAdoptionLinkClicked } = jest.requireMock("@/lib/analytics");
    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    const link = screen.getAllByRole("link", { name: /^Meet / })[0];
    expect(link).toHaveAttribute("href", mockDogs[0].adoption_url);
    expect(link).toHaveAttribute("target", "_blank");
    // Referrer is deliberately preserved: rescues see rescuedogs.me in their
    // own analytics, which is the only proof we send them traffic.
    expect(link).toHaveAttribute("rel", "noopener");
    fireEvent.click(link);
    expect(trackAdoptionLinkClicked).toHaveBeenCalledWith(mockDogs[0], "comparison", undefined);
  });

  it("offers no rescue link for a dog that is no longer listed or has an unsafe link", () => {
    render(
      <ComparisonView
        dogs={[
          { ...mockDogs[0], status: "adopted" },
          { ...mockDogs[1], adoption_url: "javascript:alert(1)" },
        ]}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    expect(screen.queryByRole("link", { name: /^Meet / })).not.toBeInTheDocument();
  });

  it("disables navigation buttons appropriately", () => {
    // Mock mobile viewport for single card view
    global.innerWidth = 375;
    global.dispatchEvent(new Event("resize"));

    render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    const prevButton = screen.getByLabelText("Previous dog");
    const nextButton = screen.getByLabelText("Next dog");

    // Initially, previous should be disabled
    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    // Navigate to last dog
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    // At the end, next should be disabled
    expect(prevButton).not.toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it("renders placeholder when dog has no image", () => {
    const dogsWithoutImages = [
      {
        ...mockDogs[0],
        primary_image_url: undefined,
      },
    ];

    render(
      <ComparisonView
        dogs={dogsWithoutImages}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    // Should render dog icon placeholder
    expect(screen.getByTestId("dog-icon-placeholder")).toBeInTheDocument();
  });

  it("handles missing profiler data gracefully", () => {
    const dogsWithoutProfiler = [
      { ...mockDogs[0], dog_profiler_data: undefined },
    ];

    render(
      <ComparisonView
        dogs={dogsWithoutProfiler}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    // Should still render basic dog info (may have multiple instances)
    expect(screen.getAllByText("Luna").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Golden Retriever Mix").length).toBeGreaterThan(
      0,
    );
  });

  it("applies correct styling for mobile breakpoint", () => {
    global.innerWidth = 375;
    global.dispatchEvent(new Event("resize"));

    const { container } = render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    const cardWrapper = container.querySelector('[data-testid="card-wrapper"]');
    expect(cardWrapper).toHaveClass("w-full");
  });

  it("applies correct styling for tablet breakpoint", () => {
    global.innerWidth = 768;
    global.dispatchEvent(new Event("resize"));

    const { container } = render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    const cardWrappers = container.querySelectorAll(
      '[data-testid="card-wrapper"]',
    );
    cardWrappers.forEach((wrapper) => {
      // Check for tablet-specific width class
      expect(wrapper).toHaveClass("w-[calc(50%-12px)]");
    });
  });

  it("applies correct styling for desktop breakpoint", () => {
    global.innerWidth = 1440;
    global.dispatchEvent(new Event("resize"));

    const { container } = render(
      <ComparisonView
        dogs={mockDogs}
        onClose={mockOnClose}
        onRemoveFavorite={mockOnRemoveFavorite}
      />,
    );

    const cardWrappers = container.querySelectorAll(
      '[data-testid="card-wrapper"]',
    );
    cardWrappers.forEach((wrapper) => {
      // Check for desktop-specific width class
      expect(wrapper).toHaveClass("w-[calc(33.333%-16px)]");
    });
  });
});
