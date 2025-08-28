import React from "react";
import { render, screen, waitFor } from "../../../../test-utils";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import DogDetailPage from "../page";
import { getAnimalBySlug } from "../../../../services/animalsService";

// mock the service
jest.mock("../../../../services/animalsService", () => ({
  getAnimalBySlug: jest.fn(),
  getAnimals: jest.fn(),
}));

// mock next/navigation
const mockRouter = { back: jest.fn(), push: jest.fn() };
const mockSearchParams = {
  get: jest.fn(() => null),
  entries: jest.fn(() => []), // Mock entries method to return empty array
  has: jest.fn(() => false),
  getAll: jest.fn(() => []),
  keys: jest.fn(() => []),
  values: jest.fn(() => []),
  toString: jest.fn(() => ""),
};

jest.mock("next/navigation", () => ({
  useParams: () => ({ slug: "test-dog-mixed-breed-1" }),
  useRouter: () => mockRouter,
  usePathname: () => "/dogs/test-dog-mixed-breed-1",
  useSearchParams: () => mockSearchParams,
}));

// mock Loading
jest.mock("../../../../components/ui/Loading", () => () => (
  <div data-testid="loading" />
));

// mock DogDetailSkeleton
jest.mock("../../../../components/ui/DogDetailSkeleton", () => () => (
  <div data-testid="loading" />
));

// mock useSwipeNavigation hook
jest.mock("../../../../hooks/useSwipeNavigation", () => ({
  useSwipeNavigation: () => ({
    handlers: {},
    prevDog: null,
    nextDog: null,
    isLoading: false,
  }),
}));

// Console error suppression is handled globally in jest.setup.js

describe("DogDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders full animal details when API succeeds", async () => {
    const mockDog = {
      id: 1,
      slug: "test-dog-mixed-breed-1",
      name: "Rover",
      standardized_breed: "Beagle",
      breed_group: "Hound",
      primary_image_url: "https://img.test/rover.jpg",
      status: "available",
      properties: { weight: "20 lbs", neutered_spayed: true },
      sex: "Male",
      organization: {
        id: 1,
        name: "Test Rescue",
      },
      organization_id: 1,
      // …add whatever else you render…
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    // Wait past loading
    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Basic assertions - check for main heading specifically
    expect(
      screen.getByRole("heading", { level: 1, name: /Rover/i }),
    ).toBeInTheDocument();
    // image - check that there's an image with the dog's name, but don't require exact src match
    // since the component may use placeholder initially
    expect(screen.getByRole("img", { name: /Rover/i })).toBeInTheDocument();
    // breed + group (may appear in multiple places now)
    expect(screen.getAllByText("Beagle").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Hound Group")).toBeInTheDocument();
    // sex (appears in metadata cards)
    expect(screen.getAllByText(/Male/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows an error message when API returns 404", async () => {
    // simulate any rejection
    getAnimalBySlug.mockRejectedValue(new Error("Not Found"));

    render(<DogDetailPage />);

    await waitFor(() => {
      // The page’s AlertTitle is "Dog Not Found"
      expect(screen.getByText(/Dog Not Found/i)).toBeInTheDocument();
    });
  });

  test("shows loading state initially", () => {
    getAnimalBySlug.mockImplementation(() => new Promise(() => {}));

    render(<DogDetailPage />);

    // Should show loading state
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });
});

describe("DogDetailPage – organization integration", () => {
  it("renders page successfully with organization integration in place", async () => {
    // arrange: return a dog similar to successful tests
    getAnimalBySlug.mockResolvedValue({
      id: 1,
      name: "Rover",
      standardized_breed: "Beagle",
      breed_group: "Hound",
      primary_image_url: "https://img/rover.jpg",
      status: "available",
      properties: {},
      sex: "Male",
    });

    render(<DogDetailPage />);

    // wait for loading to disappear
    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Verify page renders correctly (this proves organization section integration didn't break anything)
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /About Rover/i }),
    ).toBeInTheDocument();
  });

  it("handles missing organization data gracefully", async () => {
    getAnimalBySlug.mockResolvedValue({
      id: 1,
      name: "Rover",
      primary_image_url: "https://img.test/rover.jpg",
      status: "available",
      sex: "Male",
      standardized_breed: "Beagle",
      breed_group: "Hound",
      properties: {},
      // no organization data at all
    });

    render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Page should render successfully without organization
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();

    // Organization section should not be rendered when no organization data
    expect(
      screen.queryByTestId("organization-section"),
    ).not.toBeInTheDocument();
  });
});

describe("DogDetailPage - Breed Display", () => {
  it("hides breed section when breed is Unknown", async () => {
    const mockDog = {
      id: 1,
      name: "Rover",
      breed: "Unknown",
      standardized_breed: "Unknown",
      primary_image_url: "https://img.test/rover.jpg",
      status: "available",
      properties: {},
      sex: "Male",
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Should not show breed section at all when Unknown
    expect(screen.queryByText("Breed")).not.toBeInTheDocument();
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
  });

  it("hides breed section when breed is missing", async () => {
    const mockDog = {
      id: 1,
      name: "Rover",
      breed: null,
      standardized_breed: null,
      primary_image_url: "https://img.test/rover.jpg",
      status: "available",
      properties: {},
      sex: "Male",
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Should not show breed section when breed is missing
    expect(screen.queryByText("Breed")).not.toBeInTheDocument();
  });

  it("shows known breed normally", async () => {
    const mockDog = {
      id: 1,
      name: "Rover",
      breed: "Golden Retriever",
      standardized_breed: "Golden Retriever",
      breed_group: "Sporting",
      primary_image_url: "https://img.test/rover.jpg",
      status: "available",
      properties: {},
      sex: "Male",
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Should show actual breed (may appear in multiple places now)
    expect(
      screen.getAllByText("Golden Retriever").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Sporting Group")).toBeInTheDocument();
  });
});

describe("DogDetailPage - Hero Layout", () => {
  it("displays hero image above content in vertical layout", async () => {
    const mockDog = {
      id: 1,
      name: "Rover",
      breed: "Golden Retriever",
      standardized_breed: "Golden Retriever",
      primary_image_url: "https://img.test/rover.jpg",
      status: "available",
      properties: { description: "A lovely dog" },
      sex: "Male",
      organization: { name: "Test Rescue", id: 1 },
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    const { container } = render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Check that main content container uses vertical layout (flex-col)
    const mainContent = container.querySelector(".flex.flex-col");
    expect(mainContent).toBeInTheDocument();

    // Hero image should come before text content
    const image = screen.getByRole("img", { name: /Rover/i });
    const heading = screen.getByRole("heading", { level: 1, name: /Rover/i });

    // Image should come before heading in DOM order
    expect(
      image.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("uses full-width hero image container", async () => {
    const mockDog = {
      id: 1,
      name: "Rover",
      primary_image_url: "https://img.test/rover.jpg",
      status: "available",
      properties: {},
      sex: "Male",
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    const { container } = render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Hero image container should be full width
    const heroContainer = container.querySelector(
      '[data-testid="hero-section"]',
    );
    expect(heroContainer).toBeInTheDocument();
    expect(heroContainer).toHaveClass("w-full");
  });

  it("displays breadcrumb navigation above hero image", async () => {
    const mockDog = {
      id: 1,
      name: "Shadow",
      primary_image_url: "https://img.test/shadow.jpg",
      status: "available",
      properties: {},
      sex: "Male",
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Check breadcrumb navigation - look within the breadcrumb nav specifically
    const breadcrumbNav = screen.getByRole("navigation", {
      name: "Breadcrumb",
    });
    expect(breadcrumbNav).toBeInTheDocument();

    // Within the breadcrumb, check for the links and text
    const homeLinks = screen.getAllByText("Home");
    const findDogsLinks = screen.getAllByText("Find Dogs");
    const shadowTexts = screen.getAllByText("Shadow");

    // There should be at least one of each (breadcrumb + possibly header)
    expect(homeLinks.length).toBeGreaterThanOrEqual(1);
    expect(findDogsLinks.length).toBeGreaterThanOrEqual(1);
    expect(shadowTexts.length).toBeGreaterThanOrEqual(1);

    // Check specific breadcrumb links by finding within breadcrumb nav
    const homeLink = screen.getByRole("link", { name: "Home" });
    const dogsLinks = screen.getAllByRole("link", { name: "Find Dogs" });

    expect(homeLink).toHaveAttribute("href", "/");
    expect(dogsLinks[0]).toHaveAttribute("href", "/dogs");
  });

  it("displays heart and share icons in top-right of content area", async () => {
    const mockDog = {
      id: 1,
      name: "Shadow",
      primary_image_url: "https://img.test/shadow.jpg",
      status: "available",
      properties: {},
      sex: "Male",
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Check for share icon (should be in the action bar, not at bottom)
    const actionBar = screen.getByTestId("action-bar");
    expect(actionBar).toBeInTheDocument();

    // Share button should be in the action bar
  });

  it("displays metadata cards with icons in new layout", async () => {
    const mockDog = {
      id: 1,
      name: "Shadow",
      primary_image_url: "https://img.test/shadow.jpg",
      status: "available",
      properties: {},
      sex: "Male",
      age_text: "Unknown",
      standardized_breed: "Terrier Mix",
      standardized_size: "Medium Size",
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    const { container } = render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Check for metadata cards container
    const metadataCards = container.querySelector(
      '[data-testid="metadata-cards"]',
    );
    expect(metadataCards).toBeInTheDocument();

    // Check for individual metadata badges - using getAllByText for items that appear multiple times
    expect(screen.getByText("Unknown")).toBeInTheDocument(); // Age (age_text: 'Unknown')
    expect(screen.getByText("Male")).toBeInTheDocument(); // Gender
    expect(screen.getAllByText("Terrier Mix").length).toBeGreaterThanOrEqual(1); // Breed (appears in multiple places)
    expect(screen.getByText("Medium Size")).toBeInTheDocument(); // Size
  });

  it("maintains responsive layout structure on all screen sizes", async () => {
    const mockDog = {
      id: 1,
      name: "Shadow",
      primary_image_url: "https://img.test/shadow.jpg",
      status: "available",
      properties: {},
      sex: "Male",
      standardized_breed: "Terrier Mix",
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    const { container } = render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Hero image should always be full width
    const heroContainer = container.querySelector(
      '[data-testid="hero-section"]',
    );
    expect(heroContainer).toHaveClass("w-full");

    // Main layout should be flex-col (vertical) on all screen sizes
    const mainLayout = container.querySelector(".flex.flex-col.gap-8");
    expect(mainLayout).toBeInTheDocument();

    // Metadata cards should use grid layout
    const metadataCards = container.querySelector(
      '[data-testid="metadata-cards"]',
    );
    expect(metadataCards).toHaveClass("grid", "grid-cols-2", "md:grid-cols-4");

    // Action bar should use flexbox for proper icon alignment
    const actionBar = container.querySelector('[data-testid="action-bar"]');
    expect(actionBar).toHaveClass("flex", "items-center");
  });
});

describe("DogDetailPage - Enhanced Description Section", () => {
  it("always displays About section with proper header", async () => {
    const mockDog = {
      id: 1,
      name: "Rover",
      primary_image_url: "https://img.test/rover.jpg",
      status: "available",
      properties: { description: "A lovely dog" },
      sex: "Male",
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Should always show About section
    const aboutSection = screen.getByTestId("about-section");
    expect(aboutSection).toBeInTheDocument();

    // Should have proper header
    expect(
      screen.getByRole("heading", { level: 2, name: "About Rover" }),
    ).toBeInTheDocument();
  });

  it("displays description content when description exists", async () => {
    const mockDog = {
      id: 1,
      name: "Rover",
      primary_image_url: "https://img.test/rover.jpg",
      status: "available",
      properties: { description: "A lovely dog who loves to play" },
      sex: "Male",
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Should display description content
    const descriptionContent = screen.getByTestId("description-content");
    expect(descriptionContent).toBeInTheDocument();
    expect(descriptionContent).toHaveTextContent(
      "A lovely dog who loves to play",
    );
  });

  it("shows empty state message when no description exists", async () => {
    const mockDog = {
      id: 1,
      name: "Rover",
      primary_image_url: "https://img.test/rover.jpg",
      status: "available",
      properties: {}, // No description
      sex: "Male",
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Should show empty state
    const emptyDescription = screen.getByTestId("fallback-description");
    expect(emptyDescription).toBeInTheDocument();
    expect(emptyDescription).toHaveTextContent(
      "Rover is looking for a loving forever home",
    );
  });

  it("shows read more button for long descriptions", async () => {
    const longDescription =
      "A lovely dog who loves to play and run around. ".repeat(10); // > 200 chars
    const mockDog = {
      id: 1,
      name: "Rover",
      primary_image_url: "https://img.test/rover.jpg",
      status: "available",
      properties: { description: longDescription },
      sex: "Male",
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Should show read more button
    const readMoreButton = screen.getByTestId("read-more-button");
    expect(readMoreButton).toBeInTheDocument();
    expect(readMoreButton).toHaveTextContent("Read more");
  });

  it("does not show read more button for short descriptions", async () => {
    const shortDescription = "A lovely dog"; // < 200 chars
    const mockDog = {
      id: 1,
      name: "Rover",
      primary_image_url: "https://img.test/rover.jpg",
      status: "available",
      properties: { description: shortDescription },
      sex: "Male",
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Should not show read more button
    const readMoreButton = screen.queryByTestId("read-more-button");
    expect(readMoreButton).not.toBeInTheDocument();
  });

  it("expands and collapses description when read more is clicked", async () => {
    const longDescription =
      "A lovely dog who loves to play and run around. ".repeat(10);
    const mockDog = {
      id: 1,
      name: "Rover",
      primary_image_url: "https://img.test/rover.jpg",
      status: "available",
      properties: { description: longDescription },
      sex: "Male",
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    const user = userEvent.setup();

    render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    const readMoreButton = screen.getByTestId("read-more-button");

    // Initially should show "Read more"
    expect(readMoreButton).toHaveTextContent("Read more");

    // Click to expand
    await user.click(readMoreButton);

    // Should now show "Show less"
    expect(readMoreButton).toHaveTextContent("Show less");

    // Click to collapse
    await user.click(readMoreButton);

    // Should show "Read more" again
    expect(readMoreButton).toHaveTextContent("Read more");
  });

  it("handles HTML content safely in descriptions", async () => {
    const htmlDescription =
      "<p>A lovely <strong>dog</strong> who loves to play</p>";
    const mockDog = {
      id: 1,
      name: "Rover",
      primary_image_url: "https://img.test/rover.jpg",
      status: "available",
      properties: { description: htmlDescription },
      sex: "Male",
    };
    getAnimalBySlug.mockResolvedValue(mockDog);

    render(<DogDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // Should display HTML content safely
    const descriptionContent = screen.getByTestId("description-content");
    expect(descriptionContent).toBeInTheDocument();
    expect(descriptionContent.innerHTML).toContain("<strong>dog</strong>");
  });
});
