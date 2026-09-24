import fs from "fs";
import path from "path";

// Two `@keyframes fadeInUp` with different transforms collided in the cascade and
// shoved EmptyState off its card on every route except /dogs (#447).
function cssFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : cssFiles(full);
    return e.name.endsWith(".css") ? [full] : [];
  });
}

describe("CSS keyframes (#447)", () => {
  const src = path.join(__dirname, "../..");
  const definitions = cssFiles(src).flatMap((file) =>
    Array.from(fs.readFileSync(file, "utf8").matchAll(/@keyframes\s+([\w-]+)\s*\{/g), (m) => m[1]),
  );

  it("defines fadeInUp exactly once", () => {
    expect(definitions.filter((name) => name === "fadeInUp")).toHaveLength(1);
  });
});
