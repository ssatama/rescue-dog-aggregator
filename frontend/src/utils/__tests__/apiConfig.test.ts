import { getApiUrl } from "../apiConfig";

describe("apiConfig", () => {
  describe("getApiUrl", () => {
    const originalWindow = global.window;
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      global.window = originalWindow;
      process.env = originalEnv;
    });

    it("returns localhost for server-side in development", () => {
      process.env.NODE_ENV = "development";
      delete (global as any).window;

      const url = getApiUrl();

      expect(url).toBe("http://localhost:8000");
    });

    it("returns NEXT_PUBLIC_API_URL for client-side in development", () => {
      process.env.NODE_ENV = "development";
      process.env.NEXT_PUBLIC_API_URL = "https://dev-api.rescuedogs.me";
      (global as any).window = {};

      const url = getApiUrl();

      expect(url).toBe("https://dev-api.rescuedogs.me");
    });

    it("returns NEXT_PUBLIC_API_URL for server-side in production", () => {
      process.env.NODE_ENV = "production";
      process.env.NEXT_PUBLIC_API_URL = "https://api.rescuedogs.me";
      delete (global as any).window;

      const url = getApiUrl();

      expect(url).toBe("https://api.rescuedogs.me");
    });

    it("returns NEXT_PUBLIC_API_URL for client-side in production", () => {
      process.env.NODE_ENV = "production";
      process.env.NEXT_PUBLIC_API_URL = "https://api.rescuedogs.me";
      (global as any).window = {};

      const url = getApiUrl();

      expect(url).toBe("https://api.rescuedogs.me");
    });

    it("falls back to production URL when NEXT_PUBLIC_API_URL is not set", () => {
      process.env.NODE_ENV = "production";
      delete process.env.NEXT_PUBLIC_API_URL;
      (global as any).window = {};

      const url = getApiUrl();

      expect(url).toBe("https://api.rescuedogs.me");
    });

    it("returns localhost for server-side when NODE_ENV is test", () => {
      process.env.NODE_ENV = "test";
      delete (global as any).window;

      const url = getApiUrl();

      expect(url).toBe("http://localhost:8000");
    });

    it("handles undefined NODE_ENV as production", () => {
      delete process.env.NODE_ENV;
      process.env.NEXT_PUBLIC_API_URL = "https://api.rescuedogs.me";
      (global as any).window = {};

      const url = getApiUrl();

      expect(url).toBe("https://api.rescuedogs.me");
    });
  });
});
