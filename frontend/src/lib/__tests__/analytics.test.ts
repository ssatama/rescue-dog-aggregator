import posthog from "posthog-js";
import {
  trackAdoptionLinkClicked,
  trackDogViewed,
  trackFiltersApplied,
  trackGalleryPhotoViewed,
  trackLocationSet,
  trackSearchPerformed,
  trackSortChanged,
} from "../analytics";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { __loaded: true, capture: jest.fn() },
}));

const mockPosthog = posthog as unknown as {
  __loaded: boolean;
  capture: jest.Mock;
};

const dog = {
  id: 42,
  name: "Bella",
  slug: "bella-42",
  breed: "Lab mix",
  standardized_breed: "Labrador Retriever Mix",
  age_min_months: 18,
  sex: "Female",
  size: "Large",
  standardized_size: "large",
  adoption_url: "https://www.some-rescue.org/dogs/bella?ref=x",
  organization: { slug: "some-rescue", name: "Some Rescue", country: "DE" },
};

describe("analytics", () => {
  beforeEach(() => {
    mockPosthog.__loaded = true;
    mockPosthog.capture.mockClear();
  });

  it("sends the conversion event with dog properties and destination domain", () => {
    trackAdoptionLinkClicked(dog, "modal");

    expect(mockPosthog.capture).toHaveBeenCalledWith(
      "adoption_link_clicked",
      {
        dog_id: "42",
        dog_slug: "bella-42",
        dog_name: "Bella",
        breed: "Labrador Retriever Mix",
        age_category: "Young",
        sex: "Female",
        size: "large",
        org_slug: "some-rescue",
        org_name: "Some Rescue",
        org_country: "DE",
        source: "modal",
        destination_domain: "www.some-rescue.org",
      },
      { send_instantly: true },
    );
  });

  it("never throws into the click handler when PostHog fails", () => {
    mockPosthog.capture.mockImplementationOnce(() => {
      throw new Error("boom");
    });

    expect(() => trackAdoptionLinkClicked(dog, "detail_page")).not.toThrow();
  });

  it("gives dog_viewed the same dog properties so funnels can break down by them", () => {
    trackDogViewed(dog, "detail_page");
    trackAdoptionLinkClicked(dog, "detail_page");

    const [[, viewed], [, clicked]] = mockPosthog.capture.mock.calls;
    for (const key of Object.keys(viewed)) {
      expect(clicked[key]).toEqual(viewed[key]);
    }
  });

  it("tolerates a dog without organization or a valid adoption URL", () => {
    trackAdoptionLinkClicked(
      { id: 7, adoption_url: "not a url", organization: null },
      "comparison",
    );

    expect(mockPosthog.capture).toHaveBeenCalledWith(
      "adoption_link_clicked",
      expect.objectContaining({
        dog_id: "7",
        org_slug: null,
        destination_domain: null,
      }),
      { send_instantly: true },
    );
  });

  it("sends one filter_applied per changed filter and skips typed search and sort", () => {
    trackFiltersApplied(
      {
        sizeFilter: "Large",
        breedFilter: "Labrador Retriever",
        searchQuery: "bel",
        sort: "oldest",
      },
      "catalog",
    );

    expect(mockPosthog.capture.mock.calls).toEqual([
      [
        "filter_applied",
        { filter: "size", value: "Large", result_count: null, surface: "catalog" },
        undefined,
      ],
      [
        "filter_applied",
        {
          filter: "breed",
          value: "Labrador Retriever",
          result_count: null,
          surface: "catalog",
        },
        undefined,
      ],
    ]);
  });

  it("gives each page's filter keys the same filter name", () => {
    trackFiltersApplied({ ageFilter: "Puppy" }, "breed_page", 12);
    trackFiltersApplied({ age: "Puppy" }, "org_page");
    trackFiltersApplied({ shipsTo: "GB" }, "org_page");

    const names = mockPosthog.capture.mock.calls.map(([, props]) => props.filter);
    expect(names).toEqual(["age", "age", "available_country"]);
    expect(mockPosthog.capture.mock.calls[0][1].result_count).toBe(12);
  });

  it("sends search_performed without anything the visitor typed", () => {
    trackSearchPerformed("catalog", "dog", 4);

    expect(mockPosthog.capture).toHaveBeenCalledWith(
      "search_performed",
      { surface: "catalog", result_group_chosen: "dog", result_count: 4 },
      undefined,
    );
  });

  it("sends sort, gallery and location events with closed-set properties", () => {
    trackSortChanged("oldest");
    trackGalleryPhotoViewed(42, 0, 1);
    trackLocationSet("geo", "GB", false);

    expect(mockPosthog.capture.mock.calls).toEqual([
      ["sort_changed", { sort: "oldest" }, undefined],
      ["gallery_photo_viewed", { dog_id: "42", index: 0, total: 1 }, undefined],
      [
        "location_set",
        { source: "geo", country: "GB", only_adoptable: false },
        undefined,
      ],
    ]);
  });

  it("does nothing before PostHog is initialized", () => {
    mockPosthog.__loaded = false;

    trackDogViewed(dog, "detail_page");

    expect(mockPosthog.capture).not.toHaveBeenCalled();
  });
});
