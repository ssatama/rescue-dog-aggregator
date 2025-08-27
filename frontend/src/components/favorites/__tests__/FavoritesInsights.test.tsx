import { render, screen } from "@testing-library/react";
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

  it("renders enhanced insights with AI badge", () => {
    render(<FavoritesInsights insights={mockInsights} />);

    expect(screen.getByText("Your Favorites Insights")).toBeInTheDocument();
    expect(screen.getByText("AI Enhanced")).toBeInTheDocument();
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
});
