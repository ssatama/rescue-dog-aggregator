import { countriesPhrase, joinNames, rescueReach } from "../rescueReach";

describe("rescueReach (#501)", () => {
  it("says where the rescue is based, where its dogs live and where it rehomes them", () => {
    expect(
      rescueReach({ country: "BA", city: "Sarajevo", service_regions: ["BA"], ships_to: ["UK", "DE", "AT"] }),
    ).toEqual({
      basedIn: "Sarajevo, Bosnia and Herzegovina",
      dogsIn: [],
      rehomesTo: ["Austria", "Germany", "United Kingdom"],
    });
  });

  it("names the countries the dogs live in when they are not just the home country", () => {
    expect(rescueReach({ country: "DE", service_regions: ["ES", "RO"], ships_to: ["DE"] }).dogsIn).toEqual([
      "Romania",
      "Spain",
    ]);
  });

  it("leaves out what the rescue does not publish, and counts aliases once", () => {
    expect(rescueReach({ ships_to: ["UK", "GB"] })).toEqual({
      basedIn: null,
      dogsIn: [],
      rehomesTo: ["United Kingdom"],
    });
  });
});

describe("joinNames and countriesPhrase", () => {
  it("reads as a sentence", () => {
    expect(joinNames(["Germany"])).toBe("Germany");
    expect(joinNames(["Austria", "Germany"])).toBe("Austria and Germany");
    expect(joinNames(["Austria", "Germany", "Italy"])).toBe("Austria, Germany and Italy");
  });

  it("gives a count once there are too many countries to read", () => {
    expect(countriesPhrase(["A", "B", "C", "D", "E"])).toBe("A, B, C, D and E");
    expect(countriesPhrase(["A", "B", "C", "D", "E", "F"])).toBe("6 countries");
  });
});
