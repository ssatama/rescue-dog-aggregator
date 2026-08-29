import fs from "fs";
import path from "path";

/**
 * 230 available dogs have no recorded age. They are deliberately excluded from
 * the real age buckets, so an explicit "Unknown" option is the only way to
 * reach them. The option list is hardcoded in several components, so this
 * guards every copy rather than one.
 */
describe("age filter offers an Unknown option everywhere it is listed", () => {
  const SOURCE_ROOT = path.join(process.cwd(), "src");

  function sourceFilesListingAgeOptions(): string[] {
    const found: string[] = [];

    function walk(dir: string): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "__tests__" || entry.name === "node_modules") continue;
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        if (/\.test\.tsx?$/.test(entry.name)) continue;

        const contents = fs.readFileSync(full, "utf-8");
        if (contents.includes('"Any age", "Puppy"')) found.push(full);
      }
    }

    walk(SOURCE_ROOT);
    return found;
  }

  it("finds the hardcoded age option lists", () => {
    expect(sourceFilesListingAgeOptions().length).toBeGreaterThan(0);
  });

  it("has no age option list missing Unknown", () => {
    const offenders = sourceFilesListingAgeOptions().filter((file) => {
      const contents = fs.readFileSync(file, "utf-8");
      const lists = contents.match(/\["Any age",[^\]]*\]/g) || [];
      return lists.some((list) => !list.includes('"Unknown"'));
    });

    expect(offenders.map((f) => path.relative(SOURCE_ROOT, f))).toEqual([]);
  });
});
