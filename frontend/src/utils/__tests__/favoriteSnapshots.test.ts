/**
 * @jest-environment jsdom
 */
import {
  SNAPSHOTS_KEY,
  dogFromSnapshot,
  forgetDogs,
  pruneSnapshots,
  readSnapshots,
  rememberDogs,
} from "../favoriteSnapshots";

describe("favoriteSnapshots (#498)", () => {
  beforeEach(() => localStorage.clear());

  test("remembers the last known name, photo, rescue and breed", () => {
    rememberDogs([
      {
        id: 7,
        name: "Dolly",
        primary_image_url: "https://img/7.jpg",
        primary_breed: "Lurcher",
        organization: { name: "Dogs Trust" },
      },
    ]);
    expect(readSnapshots()).toEqual({
      7: { name: "Dolly", image: "https://img/7.jpg", rescue: "Dogs Trust", breed: "Lurcher" },
    });
  });

  test("never touches the favorites id list", () => {
    localStorage.setItem("rescue-dogs-favorites:v1", "[7]");
    rememberDogs([{ id: 7, name: "Dolly" }]);
    forgetDogs([7]);
    expect(localStorage.getItem("rescue-dogs-favorites:v1")).toBe("[7]");
    expect(readSnapshots()).toEqual({});
  });

  test("prunes snapshots of dogs no longer saved", () => {
    rememberDogs([
      { id: 1, name: "Kept" },
      { id: 2, name: "Gone" },
    ]);
    pruneSnapshots([1]);
    expect(readSnapshots()).toEqual({ 1: { name: "Kept" } });
  });

  test("corrupt storage reads as empty", () => {
    localStorage.setItem(SNAPSHOTS_KEY, "not json");
    expect(readSnapshots()).toEqual({});
    localStorage.setItem(SNAPSHOTS_KEY, "[1,2]");
    expect(readSnapshots()).toEqual({});
  });

  test("rebuilds a dog the API no longer returns", () => {
    expect(dogFromSnapshot(7, { name: "Dolly", rescue: "Dogs Trust" })).toEqual({
      id: 7,
      name: "Dolly",
      primary_image_url: undefined,
      primary_breed: undefined,
      organization: { name: "Dogs Trust" },
    });
  });
});
