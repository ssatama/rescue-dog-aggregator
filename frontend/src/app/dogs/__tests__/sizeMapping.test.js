// Helper function to map UI size to standardized size
export const mapUiSizeToStandardized = (uiSize) => {
  const mapping = {
    Tiny: "Tiny",
    Small: "Small",
    Medium: "Medium",
    Large: "Large",
    "Extra Large": "XLarge",
  };
  return mapping[uiSize] || null; // Return null if not found
};

describe("mapUiSizeToStandardized", () => {
  it("returns correct mapping for known sizes", () => {
    expect(mapUiSizeToStandardized("Tiny")).toBe("Tiny");
    expect(mapUiSizeToStandardized("Small")).toBe("Small");
    expect(mapUiSizeToStandardized("Medium")).toBe("Medium");
    expect(mapUiSizeToStandardized("Large")).toBe("Large");
    expect(mapUiSizeToStandardized("Extra Large")).toBe("XLarge");
  });

  it("returns null for unknown or placeholder values", () => {
    expect(mapUiSizeToStandardized("Any size")).toBeNull();
    expect(mapUiSizeToStandardized("Gigantic")).toBeNull();
    expect(mapUiSizeToStandardized("")).toBeNull();
    expect(mapUiSizeToStandardized(null)).toBeNull();
  });
});
