import React from "react";
import { act, render, screen, waitFor } from "../../../test-utils";
import AdoptableNowRow from "../AdoptableNowRow";
import { getAnimals } from "@/services/animalsService";
import { resetVisitorLocationForTests, setVisitorCountry, ANYWHERE } from "@/lib/visitorLocation";
import type { Dog } from "@/types/dog";

jest.mock("@/lib/analytics", () => ({ trackLocationSet: jest.fn(), trackDogCardClicked: jest.fn(), trackFavoriteToggled: jest.fn() }));
jest.mock("@/services/animalsService", () => ({ getAnimals: jest.fn() }));
jest.mock("@/utils/logger", () => ({ reportError: jest.fn(), logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() } }));

const dog = (id: number): Dog =>
  ({ id, name: `Dog ${id}`, slug: `dog-${id}`, status: "available", organization: { name: "Rescue" } }) as unknown as Dog;

const RESCUES = [
  { ships_to: ["UK"], dog_count: 600 },
  { ships_to: ["UK", "DE"], dog_count: 40 },
  { ships_to: ["DE"], dog_count: 300 },
];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  sessionStorage.setItem("visitorCountryGeo", "");
  resetVisitorLocationForTests();
  (getAnimals as jest.Mock).mockReset();
});

function renderRow() {
  return render(<AdoptableNowRow dogs={[dog(1), dog(2)]} totalDogs={1722} rescues={RESCUES} />);
}

describe("AdoptableNowRow", () => {
  it("shows every dog, mixed, while no country is known", () => {
    renderRow();
    expect(screen.getByRole("heading", { name: "Dogs looking for homes" })).toBeInTheDocument();
    expect(screen.getByText("1,722 listed now")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See all/ })).toHaveAttribute("href", "/dogs");
    expect(getAnimals).not.toHaveBeenCalled();
  });

  it("becomes the dogs adoptable where the visitor lives, in the catalog's spelling", async () => {
    (getAnimals as jest.Mock).mockResolvedValue([dog(7)]);
    act(() => setVisitorCountry("GB"));
    renderRow();

    expect(await screen.findByRole("heading", { name: "Adoptable to you now" })).toBeInTheDocument();
    expect(getAnimals).toHaveBeenCalledWith(
      { sort: "recommended", available_to_country: "UK", limit: 8 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByText("640 in United Kingdom")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See all/ })).toHaveAttribute("href", "/dogs?available_country=UK");
    expect(screen.getByRole("link", { name: /Dog 7/ })).toBeInTheDocument();
  });

  it("keeps every dog when no listed rescue adopts out to the country", () => {
    act(() => setVisitorCountry("FR"));
    renderRow();
    expect(screen.getByRole("heading", { name: "Dogs looking for homes" })).toBeInTheDocument();
    expect(getAnimals).not.toHaveBeenCalled();
  });

  it("keeps every dog for Anywhere", () => {
    act(() => setVisitorCountry(ANYWHERE));
    renderRow();
    expect(getAnimals).not.toHaveBeenCalled();
  });

  it("keeps every dog when the fetch fails", async () => {
    (getAnimals as jest.Mock).mockRejectedValue(new Error("offline"));
    act(() => setVisitorCountry("DE"));
    renderRow();
    await waitFor(() => expect(getAnimals).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: "Dogs looking for homes" })).toBeInTheDocument();
  });
});
