import React from "react";
import { act, render, screen } from "../../../test-utils";
import { usePathname } from "next/navigation";
import CatalogDogGrid from "../CatalogDogGrid";
import type { Dog } from "@/types/dog";

jest.mock("../DogCard", () => ({
  __esModule: true,
  default: function MockDogCard({ dog, onOpen }: { dog: Dog; onOpen?: unknown }) {
    return (
      <a href={`/dogs/${dog.slug}`} data-testid={`dog-card-${dog.id}`} data-opens-overlay={Boolean(onOpen)}>
        {dog.name}
      </a>
    );
  },
}));

const dogs = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `Dog ${i + 1}`, slug: `dog-${i + 1}` })) as Dog[];

describe("CatalogDogGrid", () => {
  it("lays every dog out on the one responsive grid, whatever the width", () => {
    render(<CatalogDogGrid dogs={dogs} />);
    dogs.forEach((dog) => expect(screen.getByTestId(`dog-card-${dog.id}`)).toBeInTheDocument());
    const row = screen.getByTestId("dog-card-1").parentElement;
    expect(row).toHaveClass("grid-cols-2", "sm:grid-cols-3", "xl:grid-cols-4");
  });

  it("opens a dog on its own page, never in an overlay", () => {
    render(<CatalogDogGrid dogs={dogs} />);
    const card = screen.getByTestId("dog-card-3");
    expect(card).toHaveAttribute("href", "/dogs/dog-3");
    expect(card).toHaveAttribute("data-opens-overlay", "false");
  });
});

describe("CatalogDogGrid back and forward (#684)", () => {
  // 2 columns in jsdom; rows estimated at 360px with a 12px gap
  const many = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, name: `Dog ${i + 1}`, slug: `dog-${i + 1}` })) as Dog[];
  let scrollTo: jest.Mock;

  function setScrollY(value: number) {
    Object.defineProperty(window, "scrollY", { value, writable: true, configurable: true });
  }

  beforeEach(() => {
    jest.useFakeTimers();
    scrollTo = jest.fn();
    window.scrollTo = scrollTo;
    window.history.replaceState(null, "", "/dogs");
    setScrollY(0);
    // jsdom lays nothing out; the virtualizer clamps to the page's height
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 30 * 372, configurable: true });
    // and every row measures 0px tall; make them measure what they're estimated at
    jest.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.dataset.index === undefined ? 0 : 360;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.mocked(usePathname).mockReturnValue("/dogs");
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 0, configurable: true });
  });

  const tops = () => scrollTo.mock.calls.map(([arg]) => (typeof arg === "object" ? arg.top : arg));

  it("starts a fresh visit at the top, not where the last page was scrolled to", () => {
    setScrollY(2400); // a client navigation keeps the previous page's position
    render(<CatalogDogGrid dogs={many} />);
    expect(tops().at(-1)).toBe(0);
  });

  it("ignores the last page's place on a client navigation, before Next.js updates the entry", () => {
    jest.mocked(usePathname).mockReturnValue("/breeds/greyhound");
    window.history.replaceState({ catalogScroll: 3330, catalogDog: 40 }, "", "/dogs?page=3");
    setScrollY(3330);
    render(<CatalogDogGrid dogs={many} />);
    expect(tops().at(-1)).toBe(0);
    expect(tops()).not.toContain(7236); // dog 40 of the last page's list
  });

  it("keeps the position of an entry that has one", () => {
    window.history.replaceState({ catalogScroll: 800 }, "", "/dogs");
    setScrollY(800);
    render(<CatalogDogGrid dogs={many} />);
    expect(tops()).not.toContain(0);
  });

  it("returns to the saved dog's row, centred", () => {
    window.history.replaceState({ catalogScroll: 3477, catalogDog: 40 }, "", "/dogs?page=3");
    render(<CatalogDogGrid dogs={many} />);
    // Row 20 starts at 20 * 372 = 7440; centred in a 768px window: 7440 + 180 - 384
    expect(tops()).toContain(7236);
  });

  it("ignores a saved dog the list doesn't reach", () => {
    window.history.replaceState({ catalogScroll: 3477, catalogDog: 90 }, "", "/dogs");
    setScrollY(3477);
    render(<CatalogDogGrid dogs={many} />);
    expect(tops().every((top) => top === 3477)).toBe(true);
  });

  it("saves the dog in the middle of the screen as the page scrolls", () => {
    window.history.replaceState({ __NA: true }, "", "/dogs");
    render(<CatalogDogGrid dogs={many} />);

    setScrollY(2000);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      jest.advanceTimersByTime(300);
    });

    // The middle, 2384px, is in row 6 (2232-2592): dogs 12 and 13
    expect(window.history.state).toEqual({ __NA: true, catalogDog: 12 });
  });

  it("saves no dog at the top of the list, where the pixel position is exact", () => {
    window.history.replaceState({ catalogDog: 12 }, "", "/dogs");
    render(<CatalogDogGrid dogs={many} />);

    setScrollY(0);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      jest.advanceTimersByTime(300);
    });

    expect(window.history.state).toEqual({});
  });
});
