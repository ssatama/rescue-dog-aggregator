import { z, ZodError } from "zod";
import { get } from "../api";

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
