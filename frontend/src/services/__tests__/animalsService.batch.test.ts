import { getAnimalsByIds } from "../animalsService";
import { get } from "../../utils/api";

jest.mock("../../utils/api", () => ({
  get: jest.fn(),
}));

const mockedGet = get as jest.MockedFunction<typeof get>;

describe("getAnimalsByIds", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("calls /api/animals/batch with ids array param", async () => {
    mockedGet.mockResolvedValue([
      { id: 1, name: "Buddy" },
      { id: 2, name: "Luna" },
    ]);

    const result = await getAnimalsByIds([1, 2]);

    expect(mockedGet).toHaveBeenCalledWith(
      "/api/animals/batch",
      { ids: [1, 2] },
      expect.objectContaining({
        schema: expect.anything(),
      }),
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 1, name: "Buddy" });
    expect(result[1]).toMatchObject({ id: 2, name: "Luna" });
  });

  test("returns empty array for empty ids", async () => {
    const result = await getAnimalsByIds([]);
    expect(result).toEqual([]);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  test("returns empty array when API returns empty list", async () => {
    mockedGet.mockResolvedValue([]);

    const result = await getAnimalsByIds([999]);
    expect(result).toEqual([]);
  });

  test("propagates API errors to caller", async () => {
    mockedGet.mockRejectedValue(new Error("Network error"));
    await expect(getAnimalsByIds([1, 2])).rejects.toThrow("Network error");
  });

  test("transforms API response through dogTransformer", async () => {
    mockedGet.mockResolvedValue([
      { id: 1, name: "Buddy", organization: "Test Rescue" },
    ]);

    const result = await getAnimalsByIds([1]);

    expect(result[0]).toMatchObject({
      id: 1,
      name: "Buddy",
      organization: { name: "Test Rescue" },
    });
  });
});
