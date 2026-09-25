import { getSimilarDogs } from "../similarDogsService";
import { getAnimals } from "../animalsService";
import type { Dog } from "../../types/dog";

jest.mock("../animalsService", () => ({ getAnimals: jest.fn() }));

const dog = { id: 7, name: "Dolly", standardized_size: "Large", age_min_months: 40 } as Dog;
const found = (ids: number[]) => ids.map((id) => ({ id, name: `Dog ${id}` })) as Dog[];

describe("getSimilarDogs", () => {
  beforeEach(() => jest.clearAllMocks());

  it("asks for the same size and age group from any rescue", async () => {
    (getAnimals as jest.Mock).mockResolvedValue([]);
    await getSimilarDogs(dog);

    expect(getAnimals).toHaveBeenCalledWith({ standardized_size: "Large", age_category: "Adult", limit: 20 });
    expect(getAnimals).not.toHaveBeenCalledWith(expect.objectContaining({ organization_id: expect.anything() }));
  });

  it("leaves out the dog itself and returns at most three", async () => {
    (getAnimals as jest.Mock).mockResolvedValue(found([1, 7, 2, 3]));

    expect((await getSimilarDogs(dog)).map((d) => d.id)).toEqual([1, 2, 3]);
  });

  it("doesn't query when neither size nor age is known", async () => {
    expect(await getSimilarDogs({ id: 9, name: "Mystery" } as Dog)).toEqual([]);
    expect(getAnimals).not.toHaveBeenCalled();
  });

  it("lets a failed request reach the caller", async () => {
    (getAnimals as jest.Mock).mockRejectedValue(new Error("down"));

    await expect(getSimilarDogs(dog)).rejects.toThrow("down");
  });
});
