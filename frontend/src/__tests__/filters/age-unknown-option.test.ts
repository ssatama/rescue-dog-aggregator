import fs from "fs";
import path from "path";

/**
 * Dogs with no recorded age are deliberately excluded from the real age
 * buckets, so an explicit "Unknown" option is the only way to reach them.
 * The option list is declared in several places, in two different shapes, and
 * they drift: the desktop breed filter bar was missed the first time.
 */
describe("age filter offers an Unknown option everywhere it is listed", () => {
  const SOURCE_ROOT = path.join(process.cwd(), "src");

  // Flat string arrays, e.g. ["Any age", "Puppy", ...]. The value doubles as
  // the label and as the API parameter.
  const FLAT_LIST = /\[\s*"Any age"[\s\S]{0,200}?\]/g;

  // Object lists, e.g. { value: "Puppy", label: "Puppies" }, which carry a
  // separate display label.
  const OBJECT_LIST = /value:\s*"Puppy"/;

  function sourceFiles(): { file: string; contents: string }[] {
    const found: { file: string; contents: string }[] = [];

    function walk(dir: string): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "__tests__" || entry.name === "node_modules") continue;
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) continue;
        found.push({ file: path.relative(SOURCE_ROOT, full), contents: fs.readFileSync(full, "utf-8") });
      }
    }

    walk(SOURCE_ROOT);
    return found;
  }

  function filesDeclaringAgeOptions(): string[] {
    return sourceFiles()
      .filter(({ contents }) => FLAT_LIST.test(contents) || OBJECT_LIST.test(contents))
      .map(({ file }) => file)
      .sort();
  }

  it("guards every file that declares age options", () => {
    // Pinned, not just non-empty: a reformat or a rename that drops a file out
    // of the scan would otherwise leave it silently unguarded.
    expect(filesDeclaringAgeOptions()).toEqual([
      "app/breeds/[slug]/BreedDetailClient.tsx",
      "app/dogs/DogsPageClientSimplified.tsx",
      "app/organizations/[slug]/OrganizationDetailClient.tsx",
      "components/breeds/BreedFilterBar.tsx",
      "utils/breedFilterUtils.ts",
      "utils/dogFilters.ts",
    ]);
  });

  it("has no age option list missing Unknown", () => {
    const offenders = sourceFiles()
      .filter(({ contents }) => {
        const flat = contents.match(FLAT_LIST) || [];
        if (flat.some((list) => !list.includes('"Unknown"'))) return true;
        return OBJECT_LIST.test(contents) && !/value:\s*"Unknown"/.test(contents);
      })
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });
});
