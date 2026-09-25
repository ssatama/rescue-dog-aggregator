import { breedHref, catalogBase, filterHref, textSearchHref } from "../searchHrefs";

const offCatalog = catalogBase("/breeds", null);

describe("searchHrefs", () => {
  it("starts from plain /dogs off the catalog", () => {
    expect(catalogBase("/breeds", new URLSearchParams("size=Small"))).toEqual({ path: "/dogs", params: new URLSearchParams() });
  });

  it("does not treat a dog page as the catalog", () => {
    expect(breedHref(catalogBase("/dogs/rex-12", new URLSearchParams("size=Small")), "Beagle")).toBe("/dogs?breed=Beagle");
  });

  it("stays on a landing page, keeping its filters", () => {
    const base = catalogBase("/dogs/senior", new URLSearchParams("sex=Male&search=old&page=2"));
    expect(textSearchHref(base, "collie")).toBe("/dogs/senior?sex=Male&search=collie");
    expect(breedHref(catalogBase("/dogs/country/GB", null), "Beagle")).toBe("/dogs/country/GB?breed=Beagle");
  });

  it("sends a filter pick to /dogs, where it cannot contradict a landing page", () => {
    const base = catalogBase("/dogs/senior", new URLSearchParams("sex=Male"));
    expect(filterHref(base, { age_category: "Puppy" })).toBe("/dogs?sex=Male&age=Puppy");
  });

  it("maps API filter params to catalog URL keys", () => {
    expect(filterHref(offCatalog, { age_category: "Senior" })).toBe("/dogs?age=Senior");
    expect(filterHref(offCatalog, { standardized_size: "XLarge" })).toBe("/dogs?size=Extra+Large");
  });

  it("offers no link for a filter the catalog URL cannot express", () => {
    expect(filterHref(offCatalog, { good_with_kids: "true" })).toBeNull();
  });

  it("clears the text search when the field is empty", () => {
    expect(textSearchHref(catalogBase("/dogs", new URLSearchParams("search=lab&sex=Male")), "  ")).toBe("/dogs?sex=Male");
  });
});
