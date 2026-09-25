import React from "react";
import { render, screen, within } from "../../../test-utils";
import HomeDogRow from "../HomeDogRow";
import type { Dog } from "@/types/dog";

jest.mock("@/lib/analytics", () => ({ trackDogCardClicked: jest.fn(), trackFavoriteToggled: jest.fn() }));

const dog = (id: number, org: string): Dog =>
  ({ id, name: `Dog ${id}`, slug: `dog-${id}`, status: "available", organization: { name: org } }) as unknown as Dog;

describe("HomeDogRow", () => {
  it("opens each dog's own page, not an overlay", () => {
    render(
      <HomeDogRow id="row" title="Waiting longest" meta="Some listed since June 2025" href="/dogs?sort=oldest" linkLabel="See all" dogs={[dog(1, "A"), dog(2, "B")]} />,
    );

    const row = screen.getByRole("region", { name: "Waiting longest" });
    expect(within(row).getByText("Some listed since June 2025")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: /See all/ })).toHaveAttribute("href", "/dogs?sort=oldest");
    expect(within(row).getByRole("link", { name: /Dog 1/ })).toHaveAttribute("href", "/dogs/dog-1");
  });

  it("shows at most eight dogs", () => {
    const dogs = Array.from({ length: 12 }, (_, i) => dog(i + 1, "A"));
    render(<HomeDogRow id="row" title="Row" href="/dogs" linkLabel="See all" dogs={dogs} />);
    expect(screen.getAllByTestId(/^dog-card-/)).toHaveLength(8);
  });

  it("renders nothing without dogs", () => {
    render(<HomeDogRow id="row" title="Row" href="/dogs" linkLabel="See all" dogs={[]} />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});
