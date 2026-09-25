import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import SimilarDogsSection from "../SimilarDogsSection";
import { getSimilarDogs } from "../../../services/similarDogsService";
import { reportError } from "../../../utils/logger";
import type { Dog } from "@/types/dog";

jest.mock("../../../services/similarDogsService", () => ({ getSimilarDogs: jest.fn() }));
jest.mock("../../../utils/logger", () => ({ reportError: jest.fn() }));
jest.mock("../../../hooks/useScrollAnimation", () => ({
  useScrollAnimation: () => [jest.fn(), true],
}));
jest.mock("../DogCard", () => ({
  __esModule: true,
  default: ({ dog, listContext }: { dog: Dog; listContext: string }) => (
    <article data-list-context={listContext}>{dog.name}</article>
  ),
}));

const dog = {
  id: 7,
  name: "Dolly",
  standardized_size: "Large",
  age_min_months: 40,
  organization: { id: 1, name: "Dogs Trust", slug: "dogs-trust" },
} as Dog;
const others = [{ id: 1, name: "Rex" }, { id: 2, name: "Bo" }] as Dog[];

describe("SimilarDogsSection", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders server-provided dogs without fetching", () => {
    render(<SimilarDogsSection dog={dog} initialDogs={others} />);

    const grid = screen.getByTestId("similar-dogs-grid");
    expect(within(grid).getAllByRole("article").map((a) => a.textContent)).toEqual(["Rex", "Bo"]);
    expect(within(grid).getByText("Rex")).toHaveAttribute("data-list-context", "similar");
    expect(getSimilarDogs).not.toHaveBeenCalled();
  });

  it("keeps a smaller link to the rescue's own dogs", () => {
    render(<SimilarDogsSection dog={dog} initialDogs={others} />);

    expect(screen.getByRole("heading", { level: 2, name: "Similar dogs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "More from Dogs Trust →" })).toHaveAttribute(
      "href",
      "/organizations/dogs-trust",
    );
  });

  it("fetches when the server sent nothing, showing a placeholder until then", async () => {
    (getSimilarDogs as jest.Mock).mockResolvedValue(others);
    render(<SimilarDogsSection dog={dog} />);

    expect(screen.getByTestId("similar-dogs-loading")).toBeInTheDocument();
    expect(await screen.findByText("Rex")).toBeInTheDocument();
    expect(getSimilarDogs).toHaveBeenCalledWith(dog);
  });

  it("hides itself when there are no similar dogs", async () => {
    (getSimilarDogs as jest.Mock).mockResolvedValue([]);
    const { container } = render(<SimilarDogsSection dog={dog} />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("hides itself and reports when the fetch fails", async () => {
    (getSimilarDogs as jest.Mock).mockRejectedValue(new Error("down"));
    const { container } = render(<SimilarDogsSection dog={dog} />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(reportError).toHaveBeenCalled();
  });

  it("renders nothing for a dog with neither size nor age", () => {
    const { container } = render(<SimilarDogsSection dog={{ id: 9, name: "Mystery" } as Dog} />);

    expect(container).toBeEmptyDOMElement();
    expect(getSimilarDogs).not.toHaveBeenCalled();
  });
});
