import fs from "fs";
import path from "path";

import { AGE_OPTIONS } from "@/constants/filters";

/**
 * Dogs with no recorded age appear under every age (#494), so no age filter
 * offers "Unknown". The option list used to be declared in several places and
 * they drifted; the catalog, breed and rescue pages now share AGE_OPTIONS.
 */
describe("age filters offer no Unknown option", () => {
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

  it("the shared list has the four ages and no Unknown", () => {
    expect(AGE_OPTIONS).toEqual(["Any age", "Puppy", "Young", "Adult", "Senior"]);
  });

  it("guards every file that declares its own age options", () => {
    // Pinned, not just non-empty: a reformat or a rename that drops a file out
    // of the scan would otherwise leave it silently unguarded.
    expect(filesDeclaringAgeOptions()).toEqual(["components/breeds/BreedFilterBar.tsx", "utils/dogFilters.ts"]);
  });

  it("has no age option list offering Unknown", () => {
    const offenders = sourceFiles()
      .filter(({ contents }) => {
        const flat = contents.match(FLAT_LIST) || [];
        if (flat.some((list) => list.includes('"Unknown"'))) return true;
        return OBJECT_LIST.test(contents) && /value:\s*"Unknown"/.test(contents);
      })
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });
});
