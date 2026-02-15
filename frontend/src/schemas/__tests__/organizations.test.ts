import { ZodError } from "zod";
import {
  ApiOrganizationSchema,
  EnhancedOrganizationSchema,
} from "../organizations";

describe("ApiOrganizationSchema", () => {
  it("parses a valid organization", () => {
    const result = ApiOrganizationSchema.parse({
      id: 1,
      name: "Happy Paws",
      slug: "happy-paws",
      country: "Finland",
    });
    expect(result.name).toBe("Happy Paws");
    expect(result.id).toBe(1);
  });

  it("rejects missing name", () => {
    expect(() =>
      ApiOrganizationSchema.parse({ id: 1, slug: "test" }),
    ).toThrow(ZodError);
  });

  it("passes through extra fields", () => {
    const result = ApiOrganizationSchema.parse({
      name: "Test Org",
      custom_field: "extra",
    });
    expect((result as Record<string, unknown>).custom_field).toBe("extra");
  });
});

describe("EnhancedOrganizationSchema", () => {
  const validEnhancedOrg = {
    id: 1,
    name: "Happy Paws",
    slug: "happy-paws",
    country: "Finland",
    total_dogs: 50,
    new_this_week: 3,
    recent_dogs: [
      { id: 1, name: "Buddy", slug: "buddy-1" },
    ],
  };

  it("parses valid enhanced organization data", () => {
    const result = EnhancedOrganizationSchema.parse(validEnhancedOrg);
    expect(result.name).toBe("Happy Paws");
    expect(result.total_dogs).toBe(50);
    expect(result.recent_dogs).toHaveLength(1);
  });

  it("passes through extra fields", () => {
    const result = EnhancedOrganizationSchema.parse({
      ...validEnhancedOrg,
      extra_field: "extra_value",
    });
    expect((result as Record<string, unknown>).extra_field).toBe("extra_value");
  });

  it("handles camelCase fields", () => {
    const result = EnhancedOrganizationSchema.parse({
      name: "Test Org",
      websiteUrl: "https://example.com",
      shipsTo: ["Finland", "Sweden"],
      socialMedia: { facebook: "https://fb.com/test" },
      serviceRegions: ["Uusimaa"],
    });
    expect(result.websiteUrl).toBe("https://example.com");
    expect(result.shipsTo).toEqual(["Finland", "Sweden"]);
  });

  it("handles snake_case fields", () => {
    const result = EnhancedOrganizationSchema.parse({
      name: "Test Org",
      website_url: "https://example.com",
      ships_to: ["Finland"],
      social_media: { facebook: "https://fb.com/test" },
      service_regions: ["Uusimaa"],
    });
    expect(result.website_url).toBe("https://example.com");
    expect(result.ships_to).toEqual(["Finland"]);
  });
});
