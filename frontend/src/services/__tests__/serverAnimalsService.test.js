// Mock for testing - React cache is not available in test environment
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: (fn) => fn, // Simple pass-through for tests
}));

import { getAnimals, getAllMetadata } from "../serverAnimalsService";

// Mock fetch for testing
global.fetch = jest.fn();

describe("Server Animals Service", () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it("should fetch animals with correct parameters", async () => {
    const mockResponse = [{ id: 1, name: "Test Dog" }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const params = { limit: 20, search: "test" };
    const result = await getAnimals(params);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/animals/?limit=20&search=test"),
      expect.objectContaining({
        next: { revalidate: 300, tags: ["animals"] },
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("should handle API errors gracefully", async () => {
    fetch.mockRejectedValueOnce(new Error("API Error"));

    const result = await getAnimals();
    expect(result).toEqual({ results: [], total: 0 });
  });

  it("should fetch all metadata successfully", async () => {
    const mockResponses = [
      ["breed1", "breed2"],
      ["country1", "country2"],
      ["country1", "country2"],
      [{ id: 1, name: "Org 1" }],
    ];

    // Mock multiple fetch calls
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[0] })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[1] })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[2] })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[3] });

    const result = await getAllMetadata();

    expect(result).toEqual({
      standardizedBreeds: ["Any breed", "breed1", "breed2"],
      locationCountries: ["Any country", "country1", "country2"],
      availableCountries: ["Any country", "country1", "country2"],
      organizations: [
        { id: null, name: "Any organization" },
        { id: 1, name: "Org 1" },
      ],
    });
  });
});
