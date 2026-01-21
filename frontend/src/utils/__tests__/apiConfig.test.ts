import { getApiUrl } from "../apiConfig";

declare const global: {
  window: (Window & typeof globalThis) | undefined;
};

describe("apiConfig", () => {
  describe("getApiUrl", () => {
    const originalWindow = global.window;
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env = { ...process.env };
    });

    afterEach(() => {
      global.window = originalWindow;
      Object.defineProperty(process.env, "NODE_ENV", {
        value: originalEnv,
        writable: true,
        configurable: true,
      });
    });

    it("returns localhost for server-side in development", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "development",
        writable: true,
        configurable: true,
      });
      global.window = undefined;

      const url = getApiUrl();

      expect(url).toBe("http://localhost:8000");
    });

    it("returns NEXT_PUBLIC_API_URL for client-side in development", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "development",
        writable: true,
        configurable: true,
      });
      process.env.NEXT_PUBLIC_API_URL = "https://dev-api.rescuedogs.me";
      global.window = {} as Window & typeof globalThis;

      const url = getApiUrl();

      expect(url).toBe("https://dev-api.rescuedogs.me");
    });

    it("returns NEXT_PUBLIC_API_URL for server-side in production", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
        configurable: true,
      });
      process.env.NEXT_PUBLIC_API_URL = "https://api.rescuedogs.me";
      global.window = undefined;

      const url = getApiUrl();

      expect(url).toBe("https://api.rescuedogs.me");
    });

    it("returns NEXT_PUBLIC_API_URL for client-side in production", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
        configurable: true,
      });
      process.env.NEXT_PUBLIC_API_URL = "https://api.rescuedogs.me";
      global.window = {} as Window & typeof globalThis;

      const url = getApiUrl();

      expect(url).toBe("https://api.rescuedogs.me");
    });

    it("falls back to production URL when NEXT_PUBLIC_API_URL is not set", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
        configurable: true,
      });
      delete process.env.NEXT_PUBLIC_API_URL;
      global.window = {} as Window & typeof globalThis;

      const url = getApiUrl();

      expect(url).toBe("https://api.rescuedogs.me");
    });

    it("returns localhost for server-side when NODE_ENV is test", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "test",
        writable: true,
        configurable: true,
      });
      global.window = undefined;

      const url = getApiUrl();

      expect(url).toBe("http://localhost:8000");
    });

    it("handles undefined NODE_ENV as production", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      process.env.NEXT_PUBLIC_API_URL = "https://api.rescuedogs.me";
      global.window = {} as Window & typeof globalThis;

      const url = getApiUrl();

      expect(url).toBe("https://api.rescuedogs.me");
    });
  });
});
