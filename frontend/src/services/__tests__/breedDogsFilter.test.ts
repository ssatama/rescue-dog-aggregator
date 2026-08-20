/**
 * A breed page counts its dogs by primary_breed but used to list them by
 * `breed`, the display label. Since a cross is labelled "X Cross", every cross
 * silently vanished: the German Shepherd Dog page claimed 61 and showed 20.
 *
 * Nothing failed, because no test looked at which field the listing queried.
 * These read the source so the invariant holds regardless of how the fetch
 * layer is cached or mocked.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (relative: string) =>
  readFileSync(join(process.cwd(), "src", relative), "utf8");

describe("breed listings query the canonical breed, not the display label", () => {
  const sources = {
    "serverAnimalsService.ts": read("services/serverAnimalsService.ts"),
    "BreedDetailClient.tsx": read("app/breeds/[slug]/BreedDetailClient.tsx"),
    "breeds/[slug]/page.tsx": read("app/breeds/[slug]/page.tsx"),
  };

  it.each(Object.keys(sources))(
    "%s never filters a breed listing by breedData.primary_breed as `breed`",
    (name) => {
      // `breed: breedData.primary_breed` compares the canonical name against
      // the display column, which excludes every "X Cross".
      expect(sources[name as keyof typeof sources]).not.toMatch(
        /\bbreed:\s*breedData\.primary_breed/,
      );
      expect(sources[name as keyof typeof sources]).not.toMatch(
        /params\.breed\s*=\s*breedData\.primary_breed/,
      );
    },
  );

  it("uses primary_breed for the breed page listing", () => {
    expect(sources["BreedDetailClient.tsx"]).toMatch(
      /params\.primary_breed\s*=\s*breedData\.primary_breed/,
    );
    expect(sources["serverAnimalsService.ts"]).toMatch(
      /primary_breed:\s*breedData\.primary_breed/,
    );
  });
});
