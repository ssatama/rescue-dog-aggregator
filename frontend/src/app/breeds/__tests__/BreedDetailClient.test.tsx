import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import BreedDetailClient from "../[slug]/BreedDetailClient";
import { resetVisitorLocationForTests } from "@/lib/visitorLocation";

const mockPush = jest.fn();
let mockSearch = "";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/breeds/lurcher",
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

const catalogProps = jest.fn();
jest.mock("@/app/dogs/DogsPageClientSimplified", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    catalogProps(props);
    return <div data-testid="catalog" />;
  },
}));
jest.mock("@/components/breeds/BreedPhotoGallery", () => ({
  __esModule: true,
  default: () => null,
}));

const lurcher = { primary_breed: "Lurcher", breed_slug: "lurcher", breed_type: "crossbreed", count: 14 };
const counts = { available_country_options: [{ value: "DE", label: "DE", count: 7 }] };

describe("BreedDetailClient (#500)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch = "";
    localStorage.clear();
    resetVisitorLocationForTests();
    window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as never;
    Element.prototype.scrollIntoView = jest.fn();
  });

  it("lists the breed's dogs in the catalog with the breed fixed", () => {
    render(<BreedDetailClient initialBreedData={lurcher as never} initialDogs={[]} breedCounts={counts} />);

    expect(screen.getByRole("heading", { name: "Lurcher dogs listed now" })).toBeInTheDocument();
    expect(catalogProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ initialParams: { primary_breed: "Lurcher" }, hideHero: true, hideBreadcrumbs: true }),
    );
  });

  it("fixes the Mixed group on the mixed breeds page", () => {
    render(
      <BreedDetailClient
        initialBreedData={{ primary_breed: "Mixed Breed", breed_slug: "mixed", count: 30 } as never}
        initialDogs={[]}
      />,
    );
    expect(catalogProps).toHaveBeenLastCalledWith(expect.objectContaining({ initialParams: { breed_group: "Mixed" } }));
  });

  it("turns 'adoptable to you' into the catalog's own country filter, keeping the others", () => {
    localStorage.setItem("visitorCountry", "DE");
    mockSearch = "size=Large&available_region=Bavaria&page=3";
    render(<BreedDetailClient initialBreedData={lurcher as never} initialDogs={[]} breedCounts={counts} />);

    fireEvent.click(screen.getByRole("button", { name: /7 adoptable to you in Germany/ }));
    expect(mockPush).toHaveBeenCalledWith("/breeds/lurcher?size=Large&available_country=DE", { scroll: false });
  });
});
