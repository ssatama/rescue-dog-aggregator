import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import DogGrid from "../catalog/DogGrid";
import { useGridColumns } from "@/hooks/useViewport";

// Mock the useGridColumns hook
jest.mock("@/hooks/useViewport", () => ({
  useGridColumns: jest.fn(),
}));

const mockDog = {
  id: "1",
  name: "Max",
  breed: "Golden Retriever",
  breed_mix: "Mix",
  age: "2 years",
  sex: "Male",
  photos: ["/test-photo.jpg"],
  summary: "A friendly dog",
  organization: {
    id: 1,
    name: "Happy Tails Rescue",
    config_id: "happy-tails",
  },
  personality_traits: ["Playful", "Friendly", "Active", "Cuddly"],
  properties: {
    location_country: "UK",
  },
};

describe("DogGrid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Mobile (2 columns)", () => {
    beforeEach(() => {
      (useGridColumns as jest.Mock).mockReturnValue(2);
    });

    it("renders dogs in a 2-column grid for mobile", () => {
      const dogs = [mockDog, { ...mockDog, id: "2", name: "Bella" }];

      render(<DogGrid dogs={dogs} variant="mobile" />);

      expect(screen.getByRole("list")).toBeInTheDocument();
      expect(screen.getByText("Max, 2 years")).toBeInTheDocument();
      expect(screen.getByText("Bella, 2 years")).toBeInTheDocument();
    });

    it("applies mobile variant class", () => {
      render(<DogGrid dogs={[mockDog]} variant="mobile" />);

      const grid = screen.getByRole("list");
      expect(grid).toHaveClass("dog-grid--mobile");
    });

    it("shows only 2 personality traits on mobile", () => {
      render(<DogGrid dogs={[mockDog]} variant="mobile" />);

      const traits = screen.getAllByText(/Playful|Friendly|Active|Cuddly/);
      // Should only show 2 traits max
      expect(traits.length).toBeLessThanOrEqual(2);
    });
  });

  describe("Tablet (3 columns)", () => {
    beforeEach(() => {
      (useGridColumns as jest.Mock).mockReturnValue(3);
    });

    it("renders dogs in a 3-column grid for tablet", () => {
      const dogs = [
        mockDog,
        { ...mockDog, id: "2", name: "Bella" },
        { ...mockDog, id: "3", name: "Charlie" },
      ];

      render(<DogGrid dogs={dogs} variant="tablet" />);

      expect(screen.getByRole("list")).toBeInTheDocument();
      expect(screen.getByText("Max, 2 years")).toBeInTheDocument();
      expect(screen.getByText("Bella, 2 years")).toBeInTheDocument();
      expect(screen.getByText("Charlie, 2 years")).toBeInTheDocument();
    });

    it("applies tablet variant class", () => {
      render(<DogGrid dogs={[mockDog]} variant="tablet" />);

      const grid = screen.getByRole("list");
      expect(grid).toHaveClass("dog-grid--tablet");
    });
  });

  describe("Loading state", () => {
    it("shows skeleton loaders when loading", () => {
      render(<DogGrid dogs={[]} loading={true} variant="mobile" />);

      const skeletons = screen.getAllByRole("status");
      expect(skeletons).toHaveLength(6); // Default skeleton count
      expect(skeletons[0]).toHaveAttribute(
        "aria-label",
        "Loading dog information",
      );
    });
  });

  describe("Click interactions", () => {
    it("calls onDogClick when a dog card is clicked", () => {
      const handleClick = jest.fn();

      render(
        <DogGrid dogs={[mockDog]} onDogClick={handleClick} variant="mobile" />,
      );

      const card = screen.getByText("Max, 2 years").closest("article");
      fireEvent.click(card!);

      expect(handleClick).toHaveBeenCalledWith(mockDog);
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      render(<DogGrid dogs={[mockDog]} variant="mobile" />);

      expect(screen.getByRole("list")).toHaveAttribute(
        "aria-label",
        "Rescue dogs available for adoption",
      );

      expect(screen.getByRole("listitem")).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Max"),
      );
    });
  });

  describe("Auto-detection of variant", () => {
    it("uses mobile variant when gridColumns is 2", () => {
      (useGridColumns as jest.Mock).mockReturnValue(2);

      render(<DogGrid dogs={[mockDog]} />); // No variant prop

      const grid = screen.getByRole("list");
      expect(grid).toHaveClass("dog-grid--mobile");
    });

    it("uses tablet variant when gridColumns is 3", () => {
      (useGridColumns as jest.Mock).mockReturnValue(3);

      render(<DogGrid dogs={[mockDog]} />); // No variant prop

      const grid = screen.getByRole("list");
      expect(grid).toHaveClass("dog-grid--tablet");
    });
  });
});
