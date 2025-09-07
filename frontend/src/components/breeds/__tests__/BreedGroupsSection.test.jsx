import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import BreedGroupsSection from "../BreedGroupsSection";

const mockBreedGroups = [
  {
    name: "Hound Group",
    icon: "🐕",
    description: "Bred for hunting by sight or scent",
    count: 330,
    top_breeds: [
      { name: "Galgo", slug: "galgo", count: 101 },
      { name: "Podenco", slug: "podenco", count: 68 },
      { name: "Greyhound", slug: "greyhound", count: 45 }
    ]
  },
  {
    name: "Sporting Group",
    icon: "🦮",
    description: "Active dogs bred for hunting and retrieving",
    count: 140,
    top_breeds: [
      { name: "Cocker Spaniel", slug: "cocker-spaniel", count: 43 },
      { name: "Pointer", slug: "pointer", count: 22 },
      { name: "Labrador", slug: "labrador", count: 20 }
    ]
  },
  {
    name: "Herding Group",
    icon: "🐑",
    description: "Intelligent breeds that control livestock",
    count: 122,
    top_breeds: [
      { name: "Collie", slug: "collie", count: 45 },
      { name: "German Shepherd", slug: "german-shepherd", count: 36 },
      { name: "Australian Shepherd", slug: "australian-shepherd", count: 24 }
    ]
  },
  {
    name: "Working Group",
    icon: "💪",
    description: "Strong dogs bred for guarding and rescue",
    count: 85,
    top_breeds: [
      { name: "Husky", slug: "husky", count: 33 },
      { name: "Rottweiler", slug: "rottweiler", count: 12 },
      { name: "Mastiff", slug: "mastiff", count: 8 }
    ]
  },
  {
    name: "Terrier Group",
    icon: "🦴",
    description: "Feisty & determined",
    count: 101,
    top_breeds: [
      { name: "Jack Russell", slug: "jack-russell", count: 28 },
      { name: "Bull Terrier", slug: "bull-terrier", count: 15 }
    ]
  },
  {
    name: "Toy Group",
    icon: "🎀",
    description: "Small companions",
    count: 73,
    top_breeds: [
      { name: "Chihuahua", slug: "chihuahua", count: 22 },
      { name: "Pomeranian", slug: "pomeranian", count: 18 }
    ]
  }
];

describe("BreedGroupsSection", () => {
  it("renders section with title", () => {
    render(<BreedGroupsSection breedGroups={mockBreedGroups} />);
    expect(screen.getByText("Explore by Breed Group")).toBeInTheDocument();
  });

  it("initially shows 4 breed groups", () => {
    render(<BreedGroupsSection breedGroups={mockBreedGroups} />);
    
    // Should show first 4 groups
    expect(screen.getByText("Hound Group")).toBeInTheDocument();
    expect(screen.getByText("Sporting Group")).toBeInTheDocument();
    expect(screen.getByText("Herding Group")).toBeInTheDocument();
    expect(screen.getByText("Working Group")).toBeInTheDocument();
    
    // Should not show groups 5 and 6 initially
    expect(screen.queryByText("Terrier Group")).not.toBeInTheDocument();
    expect(screen.queryByText("Toy Group")).not.toBeInTheDocument();
  });

  it("displays group counts and descriptions", () => {
    render(<BreedGroupsSection breedGroups={mockBreedGroups} />);
    
    expect(screen.getByText("330 dogs")).toBeInTheDocument();
    expect(screen.getByText("Bred for hunting by sight or scent")).toBeInTheDocument();
    expect(screen.getByText("140 dogs")).toBeInTheDocument();
    expect(screen.getByText("Active dogs bred for hunting and retrieving")).toBeInTheDocument();
  });

  it("expands to show all groups when Show More clicked", () => {
    render(<BreedGroupsSection breedGroups={mockBreedGroups} />);
    
    const showMoreButton = screen.getByRole("button", { name: /Show More Groups/i });
    fireEvent.click(showMoreButton);
    
    // Now all groups should be visible
    expect(screen.getByText("Terrier Group")).toBeInTheDocument();
    expect(screen.getByText("Toy Group")).toBeInTheDocument();
    
    // Button should change to Show Less
    expect(screen.getByRole("button", { name: /Show Less/i })).toBeInTheDocument();
  });

  it("collapses groups when Show Less clicked", () => {
    render(<BreedGroupsSection breedGroups={mockBreedGroups} />);
    
    // Expand first
    const showMoreButton = screen.getByRole("button", { name: /Show More Groups/i });
    fireEvent.click(showMoreButton);
    
    // Then collapse
    const showLessButton = screen.getByRole("button", { name: /Show Less/i });
    fireEvent.click(showLessButton);
    
    // Should be back to 4 groups
    expect(screen.queryByText("Terrier Group")).not.toBeInTheDocument();
    expect(screen.queryByText("Toy Group")).not.toBeInTheDocument();
  });

  it("shows top breeds when group is clicked", () => {
    render(<BreedGroupsSection breedGroups={mockBreedGroups} />);
    
    const houndGroup = screen.getByTestId("breed-group-hound-group");
    fireEvent.click(houndGroup);
    
    // Should show top breeds for Hound Group
    expect(screen.getByText("Galgo")).toBeInTheDocument();
    expect(screen.getByText("101 available")).toBeInTheDocument();
    expect(screen.getByText("Podenco")).toBeInTheDocument();
    expect(screen.getByText("68 available")).toBeInTheDocument();
  });

  it("toggles breed display when group is clicked again", () => {
    render(<BreedGroupsSection breedGroups={mockBreedGroups} />);
    
    const houndGroup = screen.getByTestId("breed-group-hound-group");
    
    // First click - expand
    fireEvent.click(houndGroup);
    expect(screen.getByText("Galgo")).toBeInTheDocument();
    
    // Second click - collapse
    fireEvent.click(houndGroup);
    expect(screen.queryByText("Galgo")).not.toBeInTheDocument();
  });

  it("allows multiple groups to be expanded simultaneously", () => {
    render(<BreedGroupsSection breedGroups={mockBreedGroups} />);
    
    const houndGroup = screen.getByTestId("breed-group-hound-group");
    const sportingGroup = screen.getByTestId("breed-group-sporting-group");
    
    fireEvent.click(houndGroup);
    fireEvent.click(sportingGroup);
    
    // Both groups' breeds should be visible
    expect(screen.getByText("Galgo")).toBeInTheDocument();
    expect(screen.getByText("Cocker Spaniel")).toBeInTheDocument();
  });

  it("links top breeds to their breed pages", () => {
    render(<BreedGroupsSection breedGroups={mockBreedGroups} />);
    
    const houndGroup = screen.getByTestId("breed-group-hound-group");
    fireEvent.click(houndGroup);
    
    const galgoLink = screen.getByRole("link", { name: /Galgo.*101 available/i });
    expect(galgoLink).toHaveAttribute("href", "/breeds/galgo");
  });

  it("renders empty state when no groups provided", () => {
    render(<BreedGroupsSection breedGroups={[]} />);
    expect(screen.queryByText("Explore by Breed Group")).not.toBeInTheDocument();
  });

  it("applies responsive grid layout", () => {
    const { container } = render(<BreedGroupsSection breedGroups={mockBreedGroups} />);
    
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-1");
    expect(grid).toHaveClass("md:grid-cols-2");
    expect(grid).toHaveClass("lg:grid-cols-4");
  });

  it("displays group icons", () => {
    render(<BreedGroupsSection breedGroups={mockBreedGroups} />);
    
    expect(screen.getByText("🐕")).toBeInTheDocument();
    expect(screen.getByText("🦮")).toBeInTheDocument();
    expect(screen.getByText("🐑")).toBeInTheDocument();
    expect(screen.getByText("💪")).toBeInTheDocument();
  });
});