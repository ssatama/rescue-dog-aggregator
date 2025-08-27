import { render, screen, fireEvent } from "@testing-library/react";
import FavoritesInsights from "../FavoritesInsights";

const mockInsights = {
  hasEnhancedData: true,
  personalityPattern: {
    personalityTheme: "Active and Social",
    dominantTraits: ["friendly", "energetic", "playful", "social"],
    commonTraits: ["good with dogs", "likes walks"],
  },
  lifestyleCompatibility: {
    messages: [
      "All dogs are good with children",
      "Perfect for active families",
    ],
  },
  experienceRequirements: {
    recommendation: "Best suited for families with some dog experience",
  },
  hiddenGems: {
    uniqueQuirks: [
      { dogName: "Buddy", quirk: "Loves to play fetch" },
      { dogName: "Luna", quirk: "Enjoys hiking adventures" },
    ],
  },
  careComplexity: {
    description: "Low maintenance dogs with basic grooming needs",
  },
  energyProfile: {
    recommendation: "High energy - needs daily exercise",
  },
  topOrganization: "Best Friends Animal Society (3 dogs)",
  ageRange: "2 - 5 years",
  sizePreference: "Medium dogs",
};

const basicInsights = {
  hasEnhancedData: false,
  topOrganization: "Local Rescue (2 dogs)",
  ageRange: "1 - 3 years",
  sizePreference: "Small dogs",
};

describe("FavoritesInsights", () => {
  it("renders loading state", () => {
    const { container } = render(
      <FavoritesInsights insights={mockInsights} insightsLoading={true} />,
    );

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders enhanced insights without AI badge", () => {
    render(<FavoritesInsights insights={mockInsights} />);

    expect(screen.getByText("Your Favorites Insights")).toBeInTheDocument();
    expect(screen.queryByText("AI Enhanced")).not.toBeInTheDocument();
    expect(screen.getByText("Personality Pattern")).toBeInTheDocument();
    expect(screen.getByText("Active and Social")).toBeInTheDocument();
  });

  it("renders personality pattern with traits", () => {
    render(<FavoritesInsights insights={mockInsights} />);

    expect(screen.getByText("Personality Pattern")).toBeInTheDocument();
    expect(screen.getByText("Active and Social")).toBeInTheDocument();
    expect(screen.getByText("friendly")).toBeInTheDocument();
    expect(screen.getByText("energetic")).toBeInTheDocument();
  });

  it("renders lifestyle compatibility messages", () => {
    render(<FavoritesInsights insights={mockInsights} />);

    expect(screen.getByText("Lifestyle Match")).toBeInTheDocument();
    expect(
      screen.getByText("All dogs are good with children"),
    ).toBeInTheDocument();
    expect(screen.getByText("Perfect for active families")).toBeInTheDocument();
  });

  it("renders experience requirements", () => {
    render(<FavoritesInsights insights={mockInsights} />);

    expect(screen.getByText("Experience Level")).toBeInTheDocument();
    expect(
      screen.getByText("Best suited for families with some dog experience"),
    ).toBeInTheDocument();
  });

  it("renders special traits with dog names", () => {
    render(<FavoritesInsights insights={mockInsights} />);

    expect(screen.getByText("Special Traits")).toBeInTheDocument();
    expect(screen.getByText(/Buddy:/)).toBeInTheDocument();
    expect(screen.getByText(/Luna:/)).toBeInTheDocument();
  });

  it("renders care requirements", () => {
    render(<FavoritesInsights insights={mockInsights} />);

    expect(screen.getByText("Care Requirements")).toBeInTheDocument();
    expect(
      screen.getByText("Low maintenance dogs with basic grooming needs"),
    ).toBeInTheDocument();
  });

  it("renders basic insights without AI badge", () => {
    render(<FavoritesInsights insights={basicInsights} />);

    expect(screen.getByText("Your Favorites Insights")).toBeInTheDocument();
    expect(screen.queryByText("AI Enhanced")).not.toBeInTheDocument();
    expect(screen.getByText("Top Organization")).toBeInTheDocument();
    expect(screen.getByText("Local Rescue (2 dogs)")).toBeInTheDocument();
  });

  it("renders size preference for non-enhanced data", () => {
    render(<FavoritesInsights insights={basicInsights} />);

    expect(screen.getByText("Size Preference")).toBeInTheDocument();
    expect(screen.getByText("Small dogs")).toBeInTheDocument();
  });

  it("does not render size preference for enhanced data", () => {
    render(<FavoritesInsights insights={mockInsights} />);

    expect(screen.queryByText("Size Preference")).not.toBeInTheDocument();
  });

  it("truncates long special traits text", () => {
    const longQuirkInsights = {
      ...mockInsights,
      hiddenGems: {
        uniqueQuirks: [
          {
            dogName: "Buddy",
            quirk:
              "This is a very long quirk description that should be truncated when it exceeds the character limit set in the component",
          },
        ],
      },
    };

    render(<FavoritesInsights insights={longQuirkInsights} />);

    expect(screen.getByText(/Buddy:/)).toBeInTheDocument();
    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument(); // Should end with ...
  });

  it("truncates long care requirements text", () => {
    const longCareInsights = {
      ...mockInsights,
      careComplexity: {
        description:
          "This is a very long care requirements description that should be truncated when it exceeds the eighty character limit set in the component for better display",
      },
    };

    render(<FavoritesInsights insights={longCareInsights} />);

    expect(screen.getByText("Care Requirements")).toBeInTheDocument();
    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument(); // Should end with ...
  });

  describe("Mobile collapse/expand functionality", () => {
    beforeEach(() => {
      // Mock window.innerWidth to simulate mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375, // Mobile width
      });
    });

    it("shows expand/collapse button on mobile with insights counter", () => {
      render(<FavoritesInsights insights={mockInsights} />);

      expect(
        screen.getByRole("button", { name: /show more insights/i }),
      ).toBeInTheDocument();

      // Should show insights counter text
      expect(
        screen.getByText(/showing \d+ of \d+ insights/i),
      ).toBeInTheDocument();
    });

    it("shows chevron down icon when collapsed", () => {
      render(<FavoritesInsights insights={mockInsights} />);

      const button = screen.getByRole("button", {
        name: /show more insights/i,
      });
      expect(button).toHaveAttribute("aria-expanded", "false");

      // Check for chevron down icon in button
      const chevronDown = button.querySelector('[aria-hidden="true"]');
      expect(chevronDown).toBeInTheDocument();
    });

    it("shows only 3 insights when collapsed on mobile", () => {
      render(<FavoritesInsights insights={mockInsights} />);

      // Should show 3 insights initially (collapsed state)
      const insightCards = screen.getAllByRole("group"); // Using role group for insight cards
      expect(insightCards).toHaveLength(3);
    });

    it("expands to show all insights when expand button is clicked", () => {
      render(<FavoritesInsights insights={mockInsights} />);

      const expandButton = screen.getByRole("button", {
        name: /show more insights/i,
      });

      // Initially collapsed - should show 3 insights
      let insightCards = screen.getAllByRole("group");
      expect(insightCards).toHaveLength(3);

      // Click to expand
      fireEvent.click(expandButton);

      // Should now show all insights (8 with our mock data)
      insightCards = screen.getAllByRole("group");
      expect(insightCards.length).toBeGreaterThan(3);

      // Button should show "show less" and be expanded
      expect(expandButton).toHaveAttribute("aria-expanded", "true");
      expect(
        screen.getByRole("button", { name: /show less insights/i }),
      ).toBeInTheDocument();
    });

    it("shows chevron up icon when expanded", () => {
      render(<FavoritesInsights insights={mockInsights} />);

      const button = screen.getByRole("button", {
        name: /show more insights/i,
      });

      // Click to expand
      fireEvent.click(button);

      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("collapses back to 3 insights when collapse button is clicked", () => {
      render(<FavoritesInsights insights={mockInsights} />);

      const toggleButton = screen.getByRole("button", {
        name: /show more insights/i,
      });

      // Expand first
      fireEvent.click(toggleButton);
      let insightCards = screen.getAllByRole("group");
      expect(insightCards.length).toBeGreaterThan(3);

      // Then collapse
      const collapseButton = screen.getByRole("button", {
        name: /show less insights/i,
      });
      fireEvent.click(collapseButton);

      // Should be back to 3 insights
      insightCards = screen.getAllByRole("group");
      expect(insightCards).toHaveLength(3);
    });

    it("applies proper CSS classes for mobile layout with improved spacing", () => {
      const { container } = render(
        <FavoritesInsights insights={mockInsights} />,
      );

      // Check for mobile-specific classes
      const insightsContainer = container.querySelector(
        '[data-testid="insights-container"]',
      );
      expect(insightsContainer).toHaveClass("max-h-[45vh]"); // Less than 50% viewport height when collapsed
      expect(insightsContainer).toHaveClass("mb-10"); // Better bottom spacing
    });

    it("applies transition classes for smooth animation", () => {
      const { container } = render(
        <FavoritesInsights insights={mockInsights} />,
      );

      const insightsGrid = container.querySelector(
        '[data-testid="insights-grid"]',
      );
      expect(insightsGrid).toHaveClass(
        "transition-all",
        "duration-300",
        "ease-in-out",
      );
    });

    it("hides expand button on desktop", () => {
      // Mock desktop width
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024, // Desktop width
      });

      render(<FavoritesInsights insights={mockInsights} />);

      expect(
        screen.queryByRole("button", { name: /show more insights/i }),
      ).not.toBeInTheDocument();
    });

    it("shows prominent expand button with animation", () => {
      const { container } = render(
        <FavoritesInsights insights={mockInsights} />,
      );

      const expandButton = screen.getByRole("button", {
        name: /show more insights/i,
      });

      // Check for prominent styling and animation classes
      expect(expandButton).toHaveClass("animate-pulse");

      // Should have larger chevron for prominence
      const chevron = expandButton.querySelector("svg");
      expect(chevron).toBeInTheDocument();
    });
  });

  describe("Enhanced visual separation", () => {
    it("applies stronger shadow for better elevation", () => {
      const { container } = render(
        <FavoritesInsights insights={mockInsights} />,
      );

      const insightsCard = container.querySelector(".shadow-lg");
      expect(insightsCard).toBeInTheDocument();
      expect(insightsCard).not.toHaveClass("shadow-sm");
    });

    it("applies stronger border for clearer separation", () => {
      const { container } = render(
        <FavoritesInsights insights={mockInsights} />,
      );

      const insightsCard = container.querySelector(".border-b-2");
      expect(insightsCard).toBeInTheDocument();
      expect(insightsCard).not.toHaveClass("border-b");
    });

    it("applies z-index for subtle elevation", () => {
      const { container } = render(
        <FavoritesInsights insights={mockInsights} />,
      );

      const insightsCard = container.querySelector(".relative.z-10");
      expect(insightsCard).toBeInTheDocument();
    });

    it("maintains proper spacing with mb-10", () => {
      const { container } = render(
        <FavoritesInsights insights={mockInsights} />,
      );

      const insightsContainer = container.querySelector(
        '[data-testid="insights-container"]',
      );
      expect(insightsContainer).toHaveClass("mb-10");
    });
  });
});
