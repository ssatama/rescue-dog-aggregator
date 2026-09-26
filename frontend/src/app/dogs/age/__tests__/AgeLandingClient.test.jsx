import { render, screen, fireEvent } from "@testing-library/react";
import AgeLandingClient from "../AgeLandingClient";
import { AGE_CATEGORIES } from "@/utils/ageData";
import { resetVisitorLocationForTests } from "@/lib/visitorLocation";

const mockShowAdoptable = jest.fn();
jest.mock("@/hooks/dogs/useShowAdoptable", () => () => mockShowAdoptable);

jest.mock("../../DogsPageClientSimplified", () => {
  return function MockDogsPageClientSimplified({ initialParams }) {
    return <div data-testid="dogs-page-client">Age: {initialParams.age_category}</div>;
  };
});

const props = {
  ageCategory: AGE_CATEGORIES.senior,
  initialDogs: [],
  metadata: {},
  totalCount: 189,
  adoptableOptions: [{ value: "UK", label: "UK", count: 64 }],
};

describe("AgeLandingClient (#502)", () => {
  afterEach(() => {
    localStorage.clear();
    resetVisitorLocationForTests();
  });

  it("introduces the age with its count, and no gradient hero", () => {
    const { container } = render(<AgeLandingClient {...props} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Senior rescue dogs");
    expect(screen.getByText("189").parentElement).toHaveTextContent("189 listed · 8+ years");
    expect(container.querySelector('[class*="gradient"]')).toBeNull();
  });

  it("links the other ages and marks this one", () => {
    render(<AgeLandingClient {...props} />);

    const nav = screen.getByRole("navigation", { name: "Browse by age" });
    const links = [...nav.querySelectorAll("a")].map((a) => [a.getAttribute("href"), a.getAttribute("aria-current")]);
    expect(links).toEqual([
      ["/dogs", null],
      ["/dogs/puppies", null],
      ["/dogs/senior", "page"],
    ]);
  });

  it("counts the dogs adoptable to the visitor and filters the list to them", () => {
    localStorage.setItem("visitorCountry", "GB");
    render(<AgeLandingClient {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /64 adoptable to you/ }));
    expect(mockShowAdoptable).toHaveBeenCalledWith("UK");
  });

  it("fixes the catalog to the page's age", () => {
    render(<AgeLandingClient {...props} />);

    expect(screen.getByTestId("dogs-page-client")).toHaveTextContent("Age: Senior");
  });
});
