import React from "react";
import { render, screen } from "@testing-library/react";
import Home from "../page";
import {
  getAgeStats,
  getAnimals,
  getAnimalsByCuration,
  getStatistics,
} from "@/services/serverAnimalsService";

jest.mock("@/components/layout/Layout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/components/home/HomeHero", () => ({ __esModule: true, default: () => <h1>hero</h1> }));
jest.mock("@/components/home/AdoptableNowRow", () => ({
  __esModule: true,
  default: ({ dogs }: { dogs: unknown[] }) => <p>first row: {dogs.length}</p>,
}));
jest.mock("@/components/home/HomeDogRow", () => ({
  __esModule: true,
  default: ({ title, meta }: { title: string; meta: string | null }) => <p>{title}: {meta}</p>,
}));
jest.mock("@/components/home/RescuesStrip", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/home/GuidesTeaser", () => ({ __esModule: true, default: () => null }));
jest.mock("@/lib/guides", () => ({ getAllGuides: jest.fn().mockResolvedValue([]) }));
jest.mock("@/services/serverAnimalsService", () => ({
  getStatistics: jest.fn(),
  getAnimals: jest.fn(),
  getAnimalsByCuration: jest.fn(),
  getAgeStats: jest.fn(),
}));

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
});

const dog = { id: 1, name: "Akil", slug: "akil", created_at: "2025-06-09T10:00:00" };

beforeEach(() => {
  // The tests run in GitHub Actions too, where the guard is off
  delete process.env.GITHUB_ACTIONS;
  (getStatistics as unknown as jest.Mock).mockResolvedValue({ total_dogs: 1722, total_organizations: 11, organizations: [] });
  (getAnimals as unknown as jest.Mock).mockResolvedValue([dog]);
  (getAnimalsByCuration as unknown as jest.Mock).mockResolvedValue([dog]);
  (getAgeStats as unknown as jest.Mock).mockResolvedValue({ total: 0, ageCategories: [] });
});

describe("home page (#497)", () => {
  it("asks for mixed rows: rescues dealt in turn, and each rescue's longest-listed dog", async () => {
    render(await Home());

    expect(getAnimals).toHaveBeenCalledWith(expect.objectContaining({ sort: "recommended", limit: 8 }));
    expect(getAnimalsByCuration).toHaveBeenCalledWith("longest_waiting", 8);
    expect(screen.getByText("first row: 1")).toBeInTheDocument();
    expect(screen.getByText("Waiting longest: Some listed since June 2025")).toBeInTheDocument();
  });

  // A failed fetch already throws (#675). An API that answers with no dogs
  // would be cached for 6 hours as a home without dogs, so that fails too
  it.each([
    ["the first row", getAnimals, []],
    ["the waiting-longest row", getAnimalsByCuration, []],
    ["the statistics", getStatistics, { total_dogs: 0, total_organizations: 0, organizations: [] }],
  ])("fails the render when %s come back empty", async (_, fetcher, empty) => {
    (fetcher as unknown as jest.Mock).mockResolvedValue(empty);
    await expect(Home()).rejects.toThrow("no dogs or statistics");
  });

  it("renders anyway in the CI build, which runs with no API", async () => {
    process.env.GITHUB_ACTIONS = "true";
    process.env.NEXT_PHASE = "phase-production-build";
    (getAnimals as unknown as jest.Mock).mockResolvedValue([]);
    await expect(Home()).resolves.toBeTruthy();
  });
});
