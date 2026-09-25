import { queryToParams } from "../queryParams";

describe("queryToParams", () => {
  it("keeps every value of a repeated key (#499: multi-size swipe filters)", () => {
    expect(queryToParams("adoptable_to_country=UK&size%5B%5D=small&size%5B%5D=medium&age%5B%5D=puppy&offset=20")).toEqual({
      adoptable_to_country: "UK",
      "size[]": ["small", "medium"],
      "age[]": "puppy",
      offset: "20",
    });
  });

  it("reads an empty string as no params", () => {
    expect(queryToParams("")).toEqual({});
  });
});
