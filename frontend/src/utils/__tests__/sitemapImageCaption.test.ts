import { buildImageCaption } from "../sitemap";

// `description` is declared in ApiDogSchema but the API never sends it at the
// top level, so the old `dog.description ? ... : fallback` always took the
// fallback and every image caption in the sitemap read the same.
describe("buildImageCaption", () => {
  const dog = (overrides = {}) =>
    ({ id: 1, name: "Bella", ...overrides }) as Parameters<
      typeof buildImageCaption
    >[0];

  it("prefers the curated profile text", () => {
    const caption = buildImageCaption(
      dog({
        dog_profiler_data: { description: "Bella loves long walks." },
        properties: { description: "raw scraped text" },
      }),
    );

    expect(caption).toBe("Bella loves long walks.");
  });

  it("falls back to the scraped description", () => {
    const caption = buildImageCaption(
      dog({ properties: { description: "Found on the streets of Sofia." } }),
    );

    expect(caption).toBe("Found on the streets of Sofia.");
  });

  it("names the dog when there is no description at all", () => {
    expect(buildImageCaption(dog())).toBe(
      "Meet Bella, available for adoption",
    );
  });

  it("strips markup and collapses whitespace", () => {
    const caption = buildImageCaption(
      dog({ properties: { description: "<p>Bella   is\n\nsweet.</p>" } }),
    );

    expect(caption).toBe("Bella is sweet.");
  });

  it("truncates on a word boundary rather than mid-word", () => {
    const caption = buildImageCaption(
      dog({ properties: { description: "Bella ".repeat(60) } }),
    );

    expect(caption.length).toBeLessThanOrEqual(201);
    expect(caption.endsWith("…")).toBe(true);
    expect(caption).not.toMatch(/Bel…$/);
  });
});
