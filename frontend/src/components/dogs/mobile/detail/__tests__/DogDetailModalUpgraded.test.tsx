import React from "react";
import { render, screen } from "../../../../../test-utils";
import "@testing-library/jest-dom";
import DogDetailModalUpgraded from "../DogDetailModalUpgraded";
import type { Dog } from "@/types/dog";

// jsdom has no layout, so focus-trap finds nothing tabbable and throws
jest.mock("focus-trap-react", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/lib/analytics", () => ({
  trackDogViewed: jest.fn(),
  trackAdoptionLinkClicked: jest.fn(),
}));

const baseDog = {
  id: 1,
  name: "Pip",
  slug: "pip-1",
  status: "available",
  sex: "",
  standardized_breed: "Unknown",
  primary_image_url: "https://img.test/pip.jpg",
  adoption_url: "https://rescue.test/pip",
  organization: { id: 1, name: "MISIs Animal Rescue", country: "RS" },
  dog_profiler_data: {
    good_with_dogs: "unknown",
    good_with_cats: "unknown",
    good_with_children: "unknown",
  },
} as unknown as Dog;

describe("DogDetailModalUpgraded", () => {
  it("leaves out unknown facts instead of labelling them", () => {
    render(<DogDetailModalUpgraded dog={baseDog} isOpen onClose={jest.fn()} />);

    expect(screen.queryByText(/unknown/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Mixed")).not.toBeInTheDocument();
    expect(screen.queryByText("Lives with")).not.toBeInTheDocument();
    expect(screen.queryByText("Good with")).not.toBeInTheDocument();
  });

  it("names the rescue and links to it with the dog page's adopt button", () => {
    render(<DogDetailModalUpgraded dog={baseDog} isOpen onClose={jest.fn()} />);

    expect(screen.getByText("MISIs Animal Rescue · Serbia")).toBeInTheDocument();
    expect(screen.getByTestId("adopt-button-modal")).toHaveAttribute("href", "https://rescue.test/pip");
  });

  it("offers no adopt button for a dog the rescue has reserved", () => {
    render(
      <DogDetailModalUpgraded dog={{ ...baseDog, status: "reserved" }} isOpen onClose={jest.fn()} />,
    );

    expect(screen.queryByTestId("adopt-button-modal")).not.toBeInTheDocument();
    expect(screen.getByText("MISIs Animal Rescue · Serbia")).toBeInTheDocument();
  });

  it("shows traits the response carries outside the profile", () => {
    render(
      <DogDetailModalUpgraded
        dog={{ ...baseDog, dog_profiler_data: undefined, personality_traits: ["gentle", "loyal"] } as Dog}
        isOpen
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("Personality")).toBeInTheDocument();
  });
});
