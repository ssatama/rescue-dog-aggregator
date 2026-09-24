import { resolvePosthogOptOut } from "../posthogOptOut";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

function makeStorage(overrides: Partial<Storage>): Storage {
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
    ...overrides,
  };
}

describe("resolvePosthogOptOut", () => {
  let storage: MemoryStorage;
  let warnSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    storage = new MemoryStorage();
    // Silence console.warn from the catch blocks during tests, but spy on it
    // so the throw-path tests can assert the developer-visible warning fires.
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("returns false when no flag is set and no opt-out is stored", () => {
    expect(resolvePosthogOptOut("", storage)).toBe(false);
  });

  it("ignores unrelated query parameters", () => {
    expect(resolvePosthogOptOut("?debug=posthog&foo=1", storage)).toBe(false);
  });

  it("persists opt-out when ?posthog_optout=1 is in the URL", () => {
    expect(resolvePosthogOptOut("?posthog_optout=1", storage)).toBe(true);
    // Subsequent visit without the flag remains opted out.
    expect(resolvePosthogOptOut("", storage)).toBe(true);
  });

  it("clears opt-out when ?posthog_optout=0 is in the URL", () => {
    storage.setItem("ph_optout", "1");
    expect(resolvePosthogOptOut("?posthog_optout=0", storage)).toBe(false);
    // Subsequent visit without the flag remains opted in.
    expect(resolvePosthogOptOut("", storage)).toBe(false);
  });

  it("returns false when storage is null (SSR safety)", () => {
    expect(resolvePosthogOptOut("?posthog_optout=1", null)).toBe(false);
  });

  it("returns false when storage reads throw and warns the developer", () => {
    const broken = makeStorage({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(resolvePosthogOptOut("", broken)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[posthogOptOut]"),
      expect.anything()
    );
  });

  it("respects prior opt-out when storage writes throw", () => {
    storage.setItem("ph_optout", "1");
    const partiallyBroken = makeStorage({
      getItem: (k: string) => storage.getItem(k),
      setItem: () => {
        throw new Error("quota exceeded");
      },
    });
    // URL flag re-applies "1", write fails, but read still confirms opt-out.
    expect(resolvePosthogOptOut("?posthog_optout=1", partiallyBroken)).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
  });

  // Regression: catch block must protect a fresh-browser setItem failure from
  // crashing the entire instrumentation-client module load. Without this the
  // existing "respects prior opt-out" test would still pass even if the catch
  // were silently removed.
  it("does not throw when setItem fails on a fresh browser", () => {
    const writeOnlyBroken = makeStorage({
      setItem: () => {
        throw new Error("quota exceeded");
      },
    });
    expect(() =>
      resolvePosthogOptOut("?posthog_optout=1", writeOnlyBroken)
    ).not.toThrow();
    expect(resolvePosthogOptOut("?posthog_optout=1", writeOnlyBroken)).toBe(
      false
    );
  });

  it("does not throw when removeItem fails on a fresh browser", () => {
    const removeBroken = makeStorage({
      removeItem: () => {
        throw new Error("locked");
      },
    });
    expect(() =>
      resolvePosthogOptOut("?posthog_optout=0", removeBroken)
    ).not.toThrow();
    expect(resolvePosthogOptOut("?posthog_optout=0", removeBroken)).toBe(false);
  });

  it("treats values other than 1 and 0 as no-op", () => {
    expect(resolvePosthogOptOut("?posthog_optout=true", storage)).toBe(false);
    storage.setItem("ph_optout", "1");
    expect(resolvePosthogOptOut("?posthog_optout=yes", storage)).toBe(true);
  });

  // Regression: empty value (`?posthog_optout=`) must not be treated as opt-in.
  // Pins against a refactor that uses `if (flag)` instead of `flag === "1"`.
  it("treats empty value ?posthog_optout= as no-op", () => {
    expect(resolvePosthogOptOut("?posthog_optout=", storage)).toBe(false);
    storage.setItem("ph_optout", "1");
    expect(resolvePosthogOptOut("?posthog_optout=", storage)).toBe(true);
  });
});
