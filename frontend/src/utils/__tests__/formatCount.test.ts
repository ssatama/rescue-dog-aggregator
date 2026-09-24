import { formatCount } from "../formatCount";

describe("formatCount", () => {
  test("groups thousands with a comma regardless of the runtime's default locale", () => {
    const original = Number.prototype.toLocaleString;
    Number.prototype.toLocaleString = function (locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions) {
      return original.call(this, locales ?? "fi-FI", options);
    };

    try {
      expect(formatCount(1531)).toBe("1,531");
    } finally {
      Number.prototype.toLocaleString = original;
    }
  });

  test("leaves small counts ungrouped", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
  });
});

describe("dogCountLabel (#458)", () => {
  const { dogCountLabel } = require("../formatCount");

  it("uses the singular for one dog", () => {
    expect(dogCountLabel(1)).toBe("1 dog");
  });

  it("uses the plural otherwise, with thousands separators", () => {
    expect(dogCountLabel(0)).toBe("0 dogs");
    expect(dogCountLabel(2)).toBe("2 dogs");
    expect(dogCountLabel(1312)).toBe("1,312 dogs");
  });
});
