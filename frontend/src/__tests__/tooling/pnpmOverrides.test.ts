/**
 * The pnpm overrides in package.json must be present in the lockfile.
 *
 * Dependabot resolves its own pnpm version when it regenerates
 * frontend/pnpm-lock.yaml, and a pnpm that reads overrides from a different
 * location writes a lockfile with no `overrides:` block at all. CI then fails
 * at `pnpm install --frozen-lockfile` with ERR_PNPM_LOCKFILE_CONFIG_MISMATCH,
 * which names neither the missing entries nor the fact that the whole block is
 * gone — so every occurrence costs a fresh investigation (see #390, first hit
 * on #372).
 *
 * These overrides pin patched versions of transitive dependencies. A lockfile
 * without them resolves the unpatched ones, so this is a supply-chain check,
 * not a tidiness check. For the same reason, no resolved package may still
 * fall inside a range an override exists to keep out.
 */
import fs from "fs";
import path from "path";

const frontendRoot = path.join(__dirname, "..", "..", "..");

function declaredOverrides(): Record<string, string> {
  const packageJson: unknown = JSON.parse(
    fs.readFileSync(path.join(frontendRoot, "package.json"), "utf8"),
  );
  const overrides = (
    packageJson as { pnpm?: { overrides?: Record<string, string> } }
  ).pnpm?.overrides;
  return overrides ?? {};
}

/**
 * Parse the lockfile's `overrides:` block into selector -> target.
 *
 * pnpm quotes a selector that would otherwise be ambiguous YAML (`'@babel/core'`)
 * and leaves the rest bare, and selectors themselves contain `@`, `<` and `>=`,
 * so the split is on the LAST colon-space rather than the first.
 */
function lockfileOverrides(): Record<string, string> {
  const block = lockfileOverridesBlock();
  const parsed: Record<string, string> = {};

  for (const line of block.split("\n")) {
    if (!line.startsWith("  ")) continue;
    const separator = line.lastIndexOf(": ");
    if (separator === -1) continue;
    const selector = line.slice(2, separator).trim().replace(/^'|'$/g, "");
    parsed[selector] = line.slice(separator + 2).trim();
  }

  return parsed;
}

function lockfileOverridesBlock(): string {
  const lockfile = fs.readFileSync(
    path.join(frontendRoot, "pnpm-lock.yaml"),
    "utf8",
  );
  const start = lockfile.indexOf("\noverrides:\n");
  if (start === -1) {
    return "";
  }
  const rest = lockfile.slice(start + 1);
  const end = rest.indexOf("\n\n");
  return end === -1 ? rest : rest.slice(0, end);
}

/** Every `name@version` the lockfile resolves, from its `packages:` section. */
function resolvedPackages(): Array<{ name: string; version: string }> {
  const lockfile = fs.readFileSync(
    path.join(frontendRoot, "pnpm-lock.yaml"),
    "utf8",
  );
  const packages = lockfile.slice(
    lockfile.indexOf("\npackages:\n"),
    lockfile.indexOf("\nsnapshots:\n"),
  );
  return [
    ...packages.matchAll(/^ {2}'?(@?[^@\s']+)@(\d+\.\d+\.\d+)[^:]*'?:$/gm),
  ].map(([, name, version]) => ({ name, version }));
}

function compareVersions(a: string, b: string): number {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] - y[i];
  }
  return 0;
}

/** True when `version` matches a selector range like `<1.2.2`, `<=4.28.6` or `>=4.0.0 <5.0.9`. */
function inRange(version: string, range: string): boolean {
  return range.split(" ").every((bound) => {
    const [, op, target] = bound.match(/^(<=|>=|<|>)(\d+\.\d+\.\d+)$/) ?? [];
    // Fail loudly rather than pass on a range form this can't read (`^1.2`, `||`, ...).
    if (!op) throw new Error(`Unsupported override range "${range}"`);
    const cmp = compareVersions(version, target);
    return { "<": cmp < 0, "<=": cmp <= 0, ">": cmp > 0, ">=": cmp >= 0 }[op]!;
  });
}

describe("pnpm overrides survive lockfile regeneration", () => {
  it("resolves no package inside a range an override exists to keep out", () => {
    const packages = resolvedPackages();
    expect(packages.length).toBeGreaterThan(0);

    const leaks = Object.keys(declaredOverrides()).flatMap((selector) => {
      const at = selector.lastIndexOf("@");
      if (at <= 0) return []; // unranged selector such as `nwsapi`
      const [name, range] = [selector.slice(0, at), selector.slice(at + 1)];
      return packages
        .filter((p) => p.name === name && inRange(p.version, range))
        .map((p) => `${p.name}@${p.version} (override ${selector})`);
    });

    expect(leaks).toEqual([]);
  });

  it("declares overrides worth protecting", () => {
    expect(Object.keys(declaredOverrides()).length).toBeGreaterThan(0);
  });

  it("keeps every declared override in pnpm-lock.yaml, with its pinned target", () => {
    if (lockfileOverridesBlock() === "") {
      throw new Error(
        "pnpm-lock.yaml has no `overrides:` block at all. Regenerate it with " +
          "`pnpm install --lockfile-only` from frontend/ - see #390.",
      );
    }

    // Comparing targets, not just selectors: an override silently re-pinned to
    // an older target would still resolve the unpatched dependency this exists
    // to keep out.
    expect(lockfileOverrides()).toMatchObject(declaredOverrides());
  });
});
