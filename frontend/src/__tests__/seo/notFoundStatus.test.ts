import fs from "fs";
import path from "path";

/**
 * A loading.tsx in a route segment, or any segment above it, starts streaming a 200
 * before the page runs, so notFound() can no longer set a 404 and Next only injects
 * noindex: a soft 404 (#441). Every route that calls notFound() must render before
 * streaming starts, so no loading.tsx may sit on its path.
 */
const APP_DIR = path.join(__dirname, "../../app");

function pagesCallingNotFound(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pagesCallingNotFound(full);
    if (entry.name === "page.tsx" && fs.readFileSync(full, "utf8").includes("notFound(")) return [full];
    return [];
  });
}

describe("routes that call notFound() return a real 404", () => {
  const pages = pagesCallingNotFound(APP_DIR);

  it("finds the dog, breed, organization, guide and country routes", () => {
    const routes = pages.map((p) => path.relative(APP_DIR, path.dirname(p)));
    expect(routes).toEqual(
      expect.arrayContaining([
        "dogs/[slug]",
        "breeds/[slug]",
        "organizations/[slug]",
        "guides/[slug]",
        "dogs/country/[code]",
      ]),
    );
  });

  it.each(pagesCallingNotFound(APP_DIR).map((p) => [path.relative(APP_DIR, path.dirname(p))]))(
    "no loading.tsx wraps %s",
    (route) => {
      const segments = route.split(path.sep);
      for (let depth = 0; depth <= segments.length; depth++) {
        const dir = path.join(APP_DIR, ...segments.slice(0, depth));
        expect(fs.existsSync(path.join(dir, "loading.tsx"))).toBe(false);
      }
    },
  );
});
