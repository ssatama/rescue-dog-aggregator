import { formatGuideDate, guideCategoryLabel } from "../guideLabels";

describe("guideCategoryLabel (#503)", () => {
  it("names the known categories", () => {
    expect(guideCategoryLabel("financial-planning")).toBe("Costs");
    expect(guideCategoryLabel("adoption-process")).toBe("Adopting from abroad");
    expect(guideCategoryLabel("owner-preparation")).toBe("First-time owners");
  });

  it("turns an unknown slug into words rather than showing it", () => {
    expect(guideCategoryLabel("health-and-care")).toBe("Health and care");
    expect(guideCategoryLabel("TRAINING")).toBe("Training");
  });
});

describe("formatGuideDate", () => {
  it("reads the same in every time zone and locale", () => {
    expect(formatGuideDate("2026-08-31")).toBe("31 Aug 2026");
  });

  it("leaves a value it cannot read as it is", () => {
    expect(formatGuideDate("soon")).toBe("soon");
  });
});
