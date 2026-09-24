import { getGallery } from "../dogImageHelpers";
import type { Dog } from "../../types/dog";

const dog = (fields: Partial<Dog>): Dog => ({ id: 1, name: "Dolly", ...fields }) as Dog;

describe("getGallery", () => {
  it("returns the API gallery as is", () => {
    const images = [
      { url: "https://x/1.jpg", width: 800, height: 600 },
      { url: "https://x/2.jpg", width: 600, height: 800 },
    ];
    expect(getGallery(dog({ images, primary_image_url: "https://x/hero.jpg" }))).toBe(images);
  });

  it("falls back to the hero for a dog cached before galleries", () => {
    expect(getGallery(dog({ primary_image_url: "https://x/hero.jpg" }))).toEqual([
      { url: "https://x/hero.jpg" },
    ]);
    expect(getGallery(dog({ images: [], primary_image_url: "https://x/hero.jpg" }))).toHaveLength(1);
  });

  it("is empty for a dog without any photo", () => {
    expect(getGallery(dog({}))).toEqual([]);
  });
});
