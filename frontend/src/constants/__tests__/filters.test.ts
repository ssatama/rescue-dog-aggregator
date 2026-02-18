import {
  FILTER_DEFAULTS,
  SIZE_API_MAPPING,
  isDefaultFilterValue,
} from "../filters"

describe("FILTER_DEFAULTS", () => {
  it("contains all expected sentinel keys", () => {
    expect(FILTER_DEFAULTS.BREED).toBe("Any breed")
    expect(FILTER_DEFAULTS.SIZE).toBe("Any size")
    expect(FILTER_DEFAULTS.AGE).toBe("Any age")
    expect(FILTER_DEFAULTS.SEX).toBe("Any")
    expect(FILTER_DEFAULTS.COUNTRY).toBe("Any country")
    expect(FILTER_DEFAULTS.REGION).toBe("Any region")
    expect(FILTER_DEFAULTS.ORGANIZATION).toBe("any")
    expect(FILTER_DEFAULTS.ALL).toBe("All")
    expect(FILTER_DEFAULTS.GROUP).toBe("Any group")
  })
})

describe("SIZE_API_MAPPING", () => {
  it("maps all 5 UI sizes to API values", () => {
    expect(SIZE_API_MAPPING["Tiny"]).toBe("Tiny")
    expect(SIZE_API_MAPPING["Small"]).toBe("Small")
    expect(SIZE_API_MAPPING["Medium"]).toBe("Medium")
    expect(SIZE_API_MAPPING["Large"]).toBe("Large")
    expect(SIZE_API_MAPPING["Extra Large"]).toBe("XLarge")
  })

  it("returns undefined for unknown sizes", () => {
    expect(SIZE_API_MAPPING["Huge" as keyof typeof SIZE_API_MAPPING]).toBeUndefined()
  })
})

describe("isDefaultFilterValue", () => {
  it("returns true for each sentinel value", () => {
    expect(isDefaultFilterValue("Any breed")).toBe(true)
    expect(isDefaultFilterValue("Any size")).toBe(true)
    expect(isDefaultFilterValue("Any age")).toBe(true)
    expect(isDefaultFilterValue("Any")).toBe(true)
    expect(isDefaultFilterValue("Any country")).toBe(true)
    expect(isDefaultFilterValue("Any region")).toBe(true)
    expect(isDefaultFilterValue("any")).toBe(true)
    expect(isDefaultFilterValue("All")).toBe(true)
    expect(isDefaultFilterValue("Any group")).toBe(true)
  })

  it("returns true for empty string, null, and undefined", () => {
    expect(isDefaultFilterValue("")).toBe(true)
    expect(isDefaultFilterValue(null)).toBe(true)
    expect(isDefaultFilterValue(undefined)).toBe(true)
  })

  it("returns false for actual filter values", () => {
    expect(isDefaultFilterValue("Labrador")).toBe(false)
    expect(isDefaultFilterValue("UK")).toBe(false)
    expect(isDefaultFilterValue("Male")).toBe(false)
    expect(isDefaultFilterValue("Large")).toBe(false)
    expect(isDefaultFilterValue("Puppy")).toBe(false)
  })
})
