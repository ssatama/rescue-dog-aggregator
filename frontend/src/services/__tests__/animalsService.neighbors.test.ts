import { getDogNeighbors } from "../animalsService";
import { reportError } from "../../utils/logger";

jest.mock("../../utils/logger", () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
  reportError: jest.fn(),
}));

// Through the real get(), which strips nulls before the schema sees them
function respondWith(body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  }) as jest.Mock;
}

describe("getDogNeighbors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("a dog without neighbours resolves to no prev and no next", async () => {
    respondWith({ prev: null, next: null });

    const neighbors = await getDogNeighbors("poppet-schnauzer-9619");

    expect(neighbors).toEqual({ prev: null, next: null });
    expect(reportError).not.toHaveBeenCalled();
  });

  test("a neighbour without a photo keeps its slug and name", async () => {
    respondWith({
      prev: { slug: "lola-1", name: "Lola", primary_image_url: null },
      next: null,
    });

    const neighbors = await getDogNeighbors("lucy-2");

    expect(neighbors.prev).toMatchObject({ slug: "lola-1", name: "Lola" });
    expect(neighbors.next).toBeNull();
    expect(reportError).not.toHaveBeenCalled();
  });

  test("a neighbour without a slug is still rejected and reported", async () => {
    respondWith({ prev: { name: "Lola" }, next: null });

    await expect(getDogNeighbors("lucy-2")).rejects.toThrow();
    expect(reportError).toHaveBeenCalledTimes(1);
  });
});
