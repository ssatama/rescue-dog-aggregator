import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CompareSelection from "../CompareSelection";
import type { Dog } from "../types";

const mockDogs: Dog[] = [
  {
    id: 1,
    name: "Buddy",
    breed: "Labrador Retriever",
    age_text: "2-3 years",
    sex: "Male",
    organization_name: "Test Rescue",
    main_image: "/test1.jpg",
  },
  {
    id: 2,
    name: "Luna",
    breed: "German Shepherd",
    age_text: "1-2 years",
    sex: "Female",
    organization_name: "Another Rescue",
    main_image: "/test2.jpg",
  },
  {
    id: 3,
    name: "Max",
    breed: "Golden Retriever",
    age_text: "3-4 years",
    sex: "Male",
    organization_name: "Test Rescue",
    main_image: "/test3.jpg",
  },
  {
    id: 4,
    name: "Bella",
    breed: "Beagle",
    age_text: "2-3 years",
    sex: "Female",
    organization_name: "Another Rescue",
  },
];

describe("CompareSelection", () => {
  const mockOnSelectionChange = jest.fn();
  const mockOnCompare = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all dogs in selection grid", () => {
      render(
        <CompareSelection
          dogs={mockDogs}
          selectedDogs={new Set()}
          onSelectionChange={mockOnSelectionChange}
          onCompare={mockOnCompare}
        />,
      );

      expect(screen.getByText("Buddy")).toBeInTheDocument();
      expect(screen.getByText("Luna")).toBeInTheDocument();
      expect(screen.getByText("Max")).toBeInTheDocument();
      expect(screen.getByText("Bella")).toBeInTheDocument();
    });

    it("displays selection instruction", () => {
      render(
        <CompareSelection
          dogs={mockDogs}
          selectedDogs={new Set()}
          onSelectionChange={mockOnSelectionChange}
          onCompare={mockOnCompare}
        />,
      );

      expect(
        screen.getByText(/Select 2-3 dogs to compare/),
      ).toBeInTheDocument();
    });

    it("shows dog images when available", () => {
      render(
        <CompareSelection
          dogs={mockDogs}
          selectedDogs={new Set()}
          onSelectionChange={mockOnSelectionChange}
          onCompare={mockOnCompare}
        />,
      );

      const buddyImage = screen.getByAltText("Buddy");
      expect(buddyImage).toBeInTheDocument();
    });

    it("shows placeholder for dogs without images", () => {
      render(
        <CompareSelection
          dogs={mockDogs}
          selectedDogs={new Set()}
          onSelectionChange={mockOnSelectionChange}
          onCompare={mockOnCompare}
        />,
      );

      expect(screen.getByTestId("dog-placeholder-3")).toBeInTheDocument();
    });
  });

  describe("Selection Logic", () => {
    it("allows selecting a dog", () => {
      render(
        <CompareSelection
          dogs={mockDogs}
          selectedDogs={new Set()}
          onSelectionChange={mockOnSelectionChange}
          onCompare={mockOnCompare}
        />,
      );

      const checkbox = screen.getByRole("checkbox", { name: /Select Buddy/i });
      fireEvent.click(checkbox);

      expect(mockOnSelectionChange).toHaveBeenCalledWith(new Set([1]));
    });

    it("allows deselecting a dog", () => {
      render(
        <CompareSelection
          dogs={mockDogs}
          selectedDogs={new Set([1])}
          onSelectionChange={mockOnSelectionChange}
          onCompare={mockOnCompare}
        />,
      );

      const checkbox = screen.getByRole("checkbox", { name: /Select Buddy/i });
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(mockOnSelectionChange).toHaveBeenCalledWith(new Set());
    });

    it("enforces maximum selection limit of 3", () => {
      render(
        <CompareSelection
          dogs={mockDogs}
          selectedDogs={new Set([1, 2, 3])}
          onSelectionChange={mockOnSelectionChange}
          onCompare={mockOnCompare}
        />,
      );

      const bellaCheckbox = screen.getByRole("checkbox", {
        name: /Select Bella/i,
      });
      expect(bellaCheckbox).toBeDisabled();
    });

    it("shows selection count", () => {
      render(
        <CompareSelection
          dogs={mockDogs}
          selectedDogs={new Set([1, 2])}
          onSelectionChange={mockOnSelectionChange}
          onCompare={mockOnCompare}
        />,
      );

      expect(screen.getByText("2 selected")).toBeInTheDocument();
    });

    it("applies selected styling to selected dogs", () => {
      render(
        <CompareSelection
          dogs={mockDogs}
          selectedDogs={new Set([1])}
          onSelectionChange={mockOnSelectionChange}
          onCompare={mockOnCompare}
        />,
      );

      const buddyCard = screen.getByTestId("dog-card-1");
      expect(buddyCard).toHaveClass("ring-2", "ring-orange-500");
    });
  });

  describe("Compare Button", () => {
    it("disables compare button with less than 2 selections", () => {
      render(
        <CompareSelection
          dogs={mockDogs}
          selectedDogs={new Set([1])}
          onSelectionChange={mockOnSelectionChange}
          onCompare={mockOnCompare}
        />,
      );

      const compareButton = screen.getByRole("button", {
        name: /Compare Selected/i,
      });
      expect(compareButton).toBeDisabled();
    });

    it("enables compare button with 2 selections", () => {
      render(
        <CompareSelection
          dogs={mockDogs}
          selectedDogs={new Set([1, 2])}
          onSelectionChange={mockOnSelectionChange}
          onCompare={mockOnCompare}
        />,
      );

      const compareButton = screen.getByRole("button", {
        name: /Compare Selected/i,
      });
      expect(compareButton).not.toBeDisabled();
    });

    it("enables compare button with 3 selections", () => {
      render(
        <CompareSelection
          dogs={mockDogs}
          selectedDogs={new Set([1, 2, 3])}
          onSelectionChange={mockOnSelectionChange}
          onCompare={mockOnCompare}
        />,
      );

      const compareButton = screen.getByRole("button", {
        name: /Compare Selected/i,
      });
      expect(compareButton).not.toBeDisabled();
    });

    it("calls onCompare when clicked with valid selection", () => {
      render(
        <CompareSelection
          dogs={mockDogs}
          selectedDogs={new Set([1, 2])}
          onSelectionChange={mockOnSelectionChange}
          onCompare={mockOnCompare}
        />,
      );

      const compareButton = screen.getByRole("button", {
        name: /Compare Selected/i,
      });
      fireEvent.click(compareButton);

      expect(mockOnCompare).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("provides accessible labels for checkboxes", () => {
      render(
        <CompareSelection
          dogs={mockDogs}
          selectedDogs={new Set()}
          onSelectionChange={mockOnSelectionChange}
          onCompare={mockOnCompare}
        />,
      );

      expect(
        screen.getByRole("checkbox", { name: /Select Buddy/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("checkbox", { name: /Select Luna/i }),
      ).toBeInTheDocument();
    });

    it("indicates disabled state in aria attributes", () => {
      render(
        <CompareSelection
          dogs={mockDogs}
          selectedDogs={new Set([1, 2, 3])}
          onSelectionChange={mockOnSelectionChange}
          onCompare={mockOnCompare}
        />,
      );

      const bellaCheckbox = screen.getByRole("checkbox", {
        name: /Select Bella/i,
      });
      expect(bellaCheckbox).toHaveAttribute("aria-disabled", "true");
    });
  });
});