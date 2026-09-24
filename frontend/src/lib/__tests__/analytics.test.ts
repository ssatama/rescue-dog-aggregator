import posthog from "posthog-js";
import {
  trackAdoptionLinkClicked,
  trackDogViewed,
  trackFiltersChanged,
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

  it("sends one event per changed filter and skips typed search", () => {
    trackFiltersChanged({
      sizeFilter: "Large",
      ageFilter: { min: 1, max: 3 },
      searchQuery: "bel",
    });

    expect(mockPosthog.capture.mock.calls).toEqual([
      [
        "filter_changed",
        { filter_type: "sizeFilter", value: "Large" },
        undefined,
      ],
      [
        "filter_changed",
        { filter_type: "ageFilter", value: '{"min":1,"max":3}' },
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
