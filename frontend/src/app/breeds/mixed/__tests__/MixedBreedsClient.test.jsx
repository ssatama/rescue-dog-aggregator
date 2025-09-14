import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import MixedBreedsClient from "../MixedBreedsClient";
import { getAnimals } from "../../../../services/animalsService";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("../../../../services/animalsService", () => ({
  getAnimals: jest.fn(),
}));

jest.mock("../../../../components/layout/Layout", () => {
  return function Layout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock("../../../../components/dogs/DogCardOptimized", () => {
  return function DogCardOptimized({ dog }) {
    return <div data-testid="dog-card">{dog.name}</div>;
  };
});

describe("MixedBreedsClient", () => {
  const mockPush = jest.fn();
  const mockSearchParams = new URLSearchParams();

  const mockBreedData = {
    primary_breed: "Mixed Breed",
    breed_type: "mixed",
    breed_group: "Mixed",
    count: 821,
    organizations: [],
    countries: [],
  };

  const mockInitialDogs = [
    { id: 1, name: "Max", breed: "Mixed", size: "medium" },
    { id: 2, name: "Luna", breed: "Mixed", size: "small" },
  ];

  const mockPopularMixes = [
    { name: "Collie Mix", count: 37, slug: "collie-mix" },
    {
      name: "Jack Russell Terrier Mix",
      count: 32,
      slug: "jack-russell-terrier-mix",
    },
  ];

  const mockBreedStats = {
    breed_groups: [{ name: "Mixed", count: 821 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ push: mockPush });
    useSearchParams.mockReturnValue(mockSearchParams);
    getAnimals.mockResolvedValue({ results: mockInitialDogs, total: 2 });
  });

  it("renders hero section with unique messaging", () => {
    render(
      <MixedBreedsClient
        breedData={mockBreedData}
        initialDogs={mockInitialDogs}
        popularMixes={mockPopularMixes}
        breedStats={mockBreedStats}
        initialParams={{}}
      />,
    );

    expect(screen.getByText("Every Mixed Breed is Unique")).toBeInTheDocument();
    expect(
      screen.getByText(/821 one-of-a-kind rescue dogs/),
    ).toBeInTheDocument();
  });

  it("displays size filter categories", () => {
    render(
      <MixedBreedsClient
        breedData={mockBreedData}
        initialDogs={mockInitialDogs}
        popularMixes={mockPopularMixes}
        breedStats={mockBreedStats}
        initialParams={{}}
      />,
    );

    expect(screen.getByText("Filter by Size")).toBeInTheDocument();
    expect(screen.getByText("Small")).toBeInTheDocument();
    expect(screen.getByText("Under 25 lbs")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("25-60 lbs")).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();
    expect(screen.getByText("Over 60 lbs")).toBeInTheDocument();
  });

  it("displays popular mixed breed types when available", () => {
    render(
      <MixedBreedsClient
        breedData={mockBreedData}
        initialDogs={mockInitialDogs}
        popularMixes={mockPopularMixes}
        breedStats={mockBreedStats}
        initialParams={{}}
      />,
    );

    expect(screen.getByText("Popular Mixed Breeds")).toBeInTheDocument();
    expect(screen.getByText("Collie Mix")).toBeInTheDocument();
    expect(screen.getByText("37")).toBeInTheDocument();
    expect(screen.getByText("Jack Russell Terrier Mix")).toBeInTheDocument();
    expect(screen.getByText("32")).toBeInTheDocument();
  });

  it("handles size filter selection", async () => {
    render(
      <MixedBreedsClient
        breedData={mockBreedData}
        initialDogs={mockInitialDogs}
        popularMixes={mockPopularMixes}
        breedStats={mockBreedStats}
        initialParams={{}}
      />,
    );

    const smallSizeButton = screen.getByRole("button", { name: /Small/i });
    fireEvent.click(smallSizeButton);

    await waitFor(() => {
      expect(getAnimals).toHaveBeenCalledWith(
        expect.objectContaining({
          breed_type: "mixed",
          size: "small",
          limit: 12,
          offset: 0,
        }),
      );
    });

    expect(mockPush).toHaveBeenCalledWith(
      "/breeds/mixed?size=small",
      expect.any(Object),
    );
  });

  it("handles quick filter chips", async () => {
    render(
      <MixedBreedsClient
        breedData={mockBreedData}
        initialDogs={mockInitialDogs}
        popularMixes={mockPopularMixes}
        breedStats={mockBreedStats}
        initialParams={{}}
      />,
    );

    const youngFilter = screen.getByText("Young");
    fireEvent.click(youngFilter);

    await waitFor(() => {
      expect(getAnimals).toHaveBeenCalledWith(
        expect.objectContaining({
          breed_type: "mixed",
          age: "young",
          limit: 12,
          offset: 0,
        }),
      );
    });
  });

  it("displays why choose mixed breeds section", () => {
    render(
      <MixedBreedsClient
        breedData={mockBreedData}
        initialDogs={mockInitialDogs}
        popularMixes={mockPopularMixes}
        breedStats={mockBreedStats}
        initialParams={{}}
      />,
    );

    expect(screen.getByText("Why Choose a Mixed Breed?")).toBeInTheDocument();
    expect(screen.getByText("Unique Personalities")).toBeInTheDocument();
    expect(screen.getByText("Healthier Genetics")).toBeInTheDocument();
    expect(screen.getByText("Perfect Companions")).toBeInTheDocument();
  });

  it("loads more dogs when button clicked", async () => {
    render(
      <MixedBreedsClient
        breedData={mockBreedData}
        initialDogs={Array(12)
          .fill(null)
          .map((_, i) => ({
            id: i,
            name: `Dog ${i}`,
            breed: "Mixed",
          }))}
        popularMixes={mockPopularMixes}
        breedStats={mockBreedStats}
        initialParams={{}}
      />,
    );

    const loadMoreButton = screen.getByText("Load More Mixed Breeds");

    getAnimals.mockResolvedValueOnce({
      results: [{ id: 13, name: "New Dog", breed: "Mixed" }],
      total: 13,
    });

    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(getAnimals).toHaveBeenCalledWith(
        expect.objectContaining({
          breed_type: "mixed",
          limit: 12,
          offset: 12,
        }),
      );
    });
  });

  it("clears all filters when clear button clicked", async () => {
    render(
      <MixedBreedsClient
        breedData={mockBreedData}
        initialDogs={mockInitialDogs}
        popularMixes={mockPopularMixes}
        breedStats={mockBreedStats}
        initialParams={{ size: "small", age: "young" }}
      />,
    );

    // Wait for filters to be applied
    await waitFor(() => {
      expect(screen.getByText(/Clear all/)).toBeInTheDocument();
    });

    const clearButton = screen.getByText(/Clear all/);
    fireEvent.click(clearButton);

    expect(mockPush).toHaveBeenCalledWith("/breeds/mixed");
  });

  it("maintains filter state from URL params", () => {
    render(
      <MixedBreedsClient
        breedData={mockBreedData}
        initialDogs={mockInitialDogs}
        popularMixes={mockPopularMixes}
        breedStats={mockBreedStats}
        initialParams={{
          size: "small",
          age: "young",
          good_with_kids: "true",
        }}
      />,
    );

    // Verify filters are active based on initial params
    const clearButton = screen.getByText(/Clear all/);
    expect(clearButton).toBeInTheDocument();
    expect(clearButton.textContent).toContain("(3)");
  });
});
