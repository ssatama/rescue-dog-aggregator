import { get } from "../api";

// Console error suppression is handled globally in jest.setup.js

// Mock global fetch
global.fetch = jest.fn();

describe("API Utilities", () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
  });

  test("get function makes request with correct URL", async () => {
    // Setup mock successful response
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ data: "test data" }),
    };
    global.fetch.mockResolvedValue(mockResponse);

    // Call the function
    await get("/test-endpoint");

    // Assert fetch was called correctly
    expect(global.fetch).toHaveBeenCalled();
    expect(global.fetch.mock.calls[0][0]).toContain("/test-endpoint");
  });
});

describe("get()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls fetch with correct URL and query string", async () => {
    const fakeJson = { foo: "bar" };
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeJson),
    });
    const result = await get("/dogs", { limit: 5, search: "rex" });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/dogs?limit=5&search=rex"),
      { headers: { "Content-Type": "application/json" } },
    );
    expect(result).toEqual(fakeJson);
  });

  it("throws on non‑ok response", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Oops",
      json: jest.fn().mockResolvedValue({}), // stub json() so .catch() branch runs
    });
    await expect(get("/dogs")).rejects.toThrow("API error: 500 Oops");
  });

  it("handles array parameters correctly by creating multiple query parameters", async () => {
    const fakeJson = { dogs: [] };
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeJson),
    });
    
    // Test with array parameters for size and age filters
    const result = await get("/api/dogs/swipe", {
      adoptable_to_country: "UK",
      "size[]": ["small", "medium", "large"],
      "age[]": ["puppy", "young"],
      limit: 20
    });
    
    // Verify that array parameters are converted to multiple query parameters
    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toContain("adoptable_to_country=UK");
    expect(calledUrl).toContain("size%5B%5D=small"); // size[]=small
    expect(calledUrl).toContain("size%5B%5D=medium"); // size[]=medium  
    expect(calledUrl).toContain("size%5B%5D=large"); // size[]=large
    expect(calledUrl).toContain("age%5B%5D=puppy"); // age[]=puppy
    expect(calledUrl).toContain("age%5B%5D=young"); // age[]=young
    expect(calledUrl).toContain("limit=20");
    
    // Verify it does NOT contain comma-separated values
    expect(calledUrl).not.toContain("small%2Cmedium%2Clarge"); // should not be "small,medium,large"
    expect(calledUrl).not.toContain("puppy%2Cyoung"); // should not be "puppy,young"
    
    expect(result).toEqual(fakeJson);
  });
});
