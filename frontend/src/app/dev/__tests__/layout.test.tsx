import fs from "fs";
import path from "path";
import DevLayout from "../layout";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

describe("test and debug pages (#445)", () => {
  const env = process.env as Record<string, string | undefined>;
  const original = env.NODE_ENV;
  afterEach(() => {
    env.NODE_ENV = original;
  });

  it("404s the dev tools in production", () => {
    env.NODE_ENV = "production";
    expect(() => DevLayout({ children: null })).toThrow("NEXT_NOT_FOUND");
  });

  it("renders them in development", () => {
    env.NODE_ENV = "development";
    expect(DevLayout({ children: "tool" })).toBe("tool");
  });

  it("ships no Sentry wizard scaffolding or image test page", () => {
    const app = path.join(__dirname, "../..");
    for (const route of ["sentry-example-page", "sentry-test", "test-images", "api/sentry-example-api"]) {
      expect(fs.existsSync(path.join(app, route))).toBe(false);
    }
  });
});
