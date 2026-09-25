import { catalogBase, filterHref, textSearchHref } from "../searchHrefs";

describe("searchHrefs", () => {
  it("starts from nothing off the catalog", () => {
    expect(catalogBase("/breeds", new URLSearchParams("size=Small")).toString()).toBe("");
  });

  it("maps API filter params to catalog URL keys", () => {
    const base = new URLSearchParams();
    expect(filterHref(base, { age_category: "Senior" })).toBe("/dogs?age=Senior");
    expect(filterHref(base, { standardized_size: "XLarge" })).toBe("/dogs?size=Extra+Large");
  });

  it("offers no link for a filter the catalog URL cannot express", () => {
    expect(filterHref(new URLSearchParams(), { good_with_kids: "true" })).toBeNull();
  });

  it("clears the text search when the field is empty", () => {
    expect(textSearchHref(catalogBase("/dogs", new URLSearchParams("search=lab&sex=Male")), "  ")).toBe("/dogs?sex=Male");
  });
});
