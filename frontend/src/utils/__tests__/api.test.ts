import { z, ZodError } from "zod";
import { get, stripNulls } from "../api";

jest.mock("../logger", () => ({
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
  reportError: jest.fn(),
}));

const { logger, reportError } = jest.requireMock("../logger");

global.fetch = jest.fn();

const TestSchema = z.object({
  id: z.number(),
  name: z.string(),
});

describe("stripNulls", () => {
  it("converts null to undefined", () => {
    expect(stripNulls(null)).toBeUndefined();
  });

  it("preserves non-null primitives", () => {
    expect(stripNulls("hello")).toBe("hello");
    expect(stripNulls(42)).toBe(42);
    expect(stripNulls(true)).toBe(true);
    expect(stripNulls(undefined)).toBeUndefined();
  });

  it("strips nulls from objects", () => {
    const input = { name: "Rex", breed: null, age: "3 years" };
    expect(stripNulls(input)).toEqual({ name: "Rex", breed: undefined, age: "3 years" });
  });

  it("strips nulls from nested objects", () => {
    const input = {
      id: 1,
      dog_profiler_data: { confidence: "shy", sociability: null },
      secondary_breed: null,
    };
    expect(stripNulls(input)).toEqual({
      id: 1,
      dog_profiler_data: { confidence: "shy", sociability: undefined },
      secondary_breed: undefined,
    });
  });

  it("strips nulls from arrays", () => {
    const input = [{ id: 1, breed: null }, { id: 2, breed: "Labrador" }];
    expect(stripNulls(input)).toEqual([
      { id: 1, breed: undefined },
      { id: 2, breed: "Labrador" },
    ]);
  });

  it("handles API response with null-stripped data passing Zod validation", () => {
    const schema = z.object({
      id: z.number(),
      secondary_breed: z.string().optional(),
    });
    const apiData = { id: 1, secondary_breed: null };
    expect(() => schema.parse(stripNulls(apiData))).not.toThrow();
  });
});

describe("get() with Zod schema validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("parses and returns data when schema matches", async () => {
    const validData = { id: 1, name: "Buddy" };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(validData),
    });

    const result = await get("/api/test", {}, { schema: TestSchema });

    expect(result).toEqual(validData);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("throws ZodError when schema validation fails", async () => {
    const invalidData = { id: "not-a-number", name: 123 };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(invalidData),
    });

    await expect(
      get("/api/test", {}, { schema: TestSchema }),
    ).rejects.toThrow(ZodError);
  });

  it("calls reportError with endpoint context on validation failure", async () => {
    const invalidData = { id: "bad", name: 123 };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(invalidData),
    });

    await expect(
      get("/api/test", {}, { schema: TestSchema }),
    ).rejects.toThrow(ZodError);

    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(
      expect.any(ZodError),
      expect.objectContaining({ endpoint: expect.stringContaining("/api/test") }),
    );
  });

  it("logs validation issues via logger.error", async () => {
    const invalidData = { id: "bad" };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(invalidData),
    });

    await expect(
      get("/api/test", {}, { schema: TestSchema }),
    ).rejects.toThrow(ZodError);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Zod validation failed"),
      expect.anything(),
    );
  });

  it("returns raw data when no schema is provided", async () => {
    const rawData = { anything: "goes", nested: { data: true } };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(rawData),
    });

    const result = await get("/api/test");

    expect(result).toEqual(rawData);
    expect(reportError).not.toHaveBeenCalled();
  });
});
