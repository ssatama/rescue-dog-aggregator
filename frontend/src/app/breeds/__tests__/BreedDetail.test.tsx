import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import BreedDetail from "../[slug]/BreedDetail";
import { resetVisitorLocationForTests } from "@/lib/visitorLocation";

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearch = "";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
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

describe("BreedDetail (#500)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch = "";
    localStorage.clear();
    resetVisitorLocationForTests();
    window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as never;
    Element.prototype.scrollIntoView = jest.fn();
  });

  it("puts the list before the stats in reading order, as phones show them (#661)", () => {
    const { container } = render(
      <BreedDetail
        initialBreedData={lurcher as never}
        initialDogs={[]}
        breedCounts={{
          total: 23,
          size_options: [],
          age_options: [],
          lifestyle: {
            good_with_kids: { count: 18, known: 23 },
            good_with_dogs: { count: 0, known: 0 },
            good_with_cats: { count: 0, known: 0 },
            first_time_friendly: { count: 0, known: 0 },
            energy_low: { count: 0, known: 0 },
            energy_medium: { count: 0, known: 0 },
            energy_high: { count: 0, known: 0 },
          },
        } as never}
      />,
    );

    const list = container.querySelector("#dogs-grid")!;
    const stats = screen.getByRole("heading", { name: /What the rescues say/ });
    expect(list.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("lists the breed's dogs in the catalog with the breed fixed", () => {
    render(<BreedDetail initialBreedData={lurcher as never} initialDogs={[]} breedCounts={counts} />);

    expect(screen.getByRole("heading", { name: "Lurcher dogs listed now" })).toBeInTheDocument();
    expect(catalogProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ initialParams: { primary_breed: "Lurcher" }, hideHero: true, hideBreadcrumbs: true }),
    );
  });

  it("lists a mixed-type breed with its own page by that breed, not the Mixed group", () => {
    render(
      <BreedDetail
        initialBreedData={{ primary_breed: "Terrier Mix", breed_slug: "terrier-mix", breed_type: "mixed", count: 5 } as never}
        initialDogs={[]}
      />,
    );
    expect(catalogProps).toHaveBeenLastCalledWith(expect.objectContaining({ initialParams: { primary_breed: "Terrier Mix" } }));
  });

  it("fixes the Mixed group on the mixed breeds page", () => {
    render(
      <BreedDetail
        initialBreedData={{ primary_breed: "Mixed Breed", breed_slug: "mixed", count: 30 } as never}
        initialDogs={[]}
      />,
    );
    expect(catalogProps).toHaveBeenLastCalledWith(expect.objectContaining({ initialParams: { breed_group: "Mixed" } }));
  });

  it("turns 'adoptable to you' into the catalog's own country filter, keeping the others", () => {
    localStorage.setItem("visitorCountry", "DE");
    mockSearch = "size=Large&available_region=Bavaria&page=3";
    render(<BreedDetail initialBreedData={lurcher as never} initialDogs={[]} breedCounts={counts} />);

    fireEvent.click(screen.getByRole("button", { name: /7 adoptable to you in Germany/ }));
    expect(mockPush).toHaveBeenCalledWith("/breeds/lurcher?size=Large&available_country=DE", { scroll: false });
  });

  it("gives the header one column when there are no photos to show (#660)", () => {
    render(<BreedDetail initialBreedData={{ ...lurcher, topDogs: [] } as never} initialDogs={[]} />);

    const header = screen.getByRole("heading", { level: 1, name: "Lurcher" }).closest(".grid");
    expect(header).not.toHaveClass("lg:grid-cols-2");
  });

  it("carries an old ?available_to_country= link over to the catalog's filter", () => {
    mockSearch = "available_to_country=DE&size=Large";
    render(<BreedDetail initialBreedData={lurcher as never} initialDogs={[]} />);
    expect(mockReplace).toHaveBeenCalledWith("/breeds/lurcher?size=Large&available_country=DE", { scroll: false });
  });
});
