/**
 * @jest-environment node
 */
describe("apiConfig", () => {
  describe("getApiUrl", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

    beforeEach(() => {
      jest.resetModules();
    });

    afterEach(() => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: originalEnv,
        writable: true,
        configurable: true,
      });
      if (originalApiUrl !== undefined) {
        process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
      } else {
        delete process.env.NEXT_PUBLIC_API_URL;
      }
    });

    it("returns localhost for server-side in development", async () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "development",
        writable: true,
        configurable: true,
      });
      delete process.env.NEXT_PUBLIC_API_URL;

      const { getApiUrl } = await import("../apiConfig");
      const url = getApiUrl();

      expect(url).toBe("http://localhost:8000");
    });

    it("returns NEXT_PUBLIC_API_URL when set in development", async () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "development",
        writable: true,
        configurable: true,
      });
      process.env.NEXT_PUBLIC_API_URL = "https://dev-api.rescuedogs.me";

      const { getApiUrl } = await import("../apiConfig");
      const url = getApiUrl();

      expect(url).toBe("http://localhost:8000");
    });

    it("returns NEXT_PUBLIC_API_URL for server-side in production", async () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
        configurable: true,
      });
      process.env.NEXT_PUBLIC_API_URL = "https://api.rescuedogs.me";

      const { getApiUrl } = await import("../apiConfig");
      const url = getApiUrl();

      expect(url).toBe("https://api.rescuedogs.me");
    });

    it("falls back to production URL when NEXT_PUBLIC_API_URL is not set", async () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
        configurable: true,
      });
      delete process.env.NEXT_PUBLIC_API_URL;

      const { getApiUrl } = await import("../apiConfig");
      const url = getApiUrl();

      expect(url).toBe("https://api.rescuedogs.me");
    });

    it("returns localhost for server-side when NODE_ENV is test", async () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "test",
        writable: true,
        configurable: true,
      });
      delete process.env.NEXT_PUBLIC_API_URL;

      const { getApiUrl } = await import("../apiConfig");
      const url = getApiUrl();

      expect(url).toBe("http://localhost:8000");
    });

    it("handles undefined NODE_ENV as production", async () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      process.env.NEXT_PUBLIC_API_URL = "https://api.rescuedogs.me";

      const { getApiUrl } = await import("../apiConfig");
      const url = getApiUrl();

      expect(url).toBe("https://api.rescuedogs.me");
    });
  });
});
