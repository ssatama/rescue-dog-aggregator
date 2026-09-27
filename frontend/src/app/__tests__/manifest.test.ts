import fs from "fs";
import path from "path";
import manifest from "../manifest";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe("web app manifest", () => {
  const result = manifest();

  it("installs as a standalone app that opens on the home page", () => {
    expect(result).toEqual(
      expect.objectContaining({ id: "/", start_url: "/", scope: "/", display: "standalone" }),
    );
    expect(result.short_name!.length).toBeLessThanOrEqual(12);
  });

  it("has regular and maskable icons at the sizes browsers require", () => {
    const icons = result.icons!;
    expect(icons).toContainEqual(expect.objectContaining({ sizes: "192x192", purpose: "any" }));
    expect(icons).toContainEqual(expect.objectContaining({ sizes: "512x512", purpose: "any" }));
    expect(icons).toContainEqual(expect.objectContaining({ sizes: "512x512", purpose: "maskable" }));
  });

  // The old icons were JPEGs named .png, which some installers reject
  it.each([
    ...manifest().icons!.map((icon) => icon.src),
    "/apple-touch-icon.png",
  ])("%s is a real PNG in public/", (src) => {
    const file = fs.readFileSync(path.join(process.cwd(), "public", src));
    expect(file.subarray(0, 4)).toEqual(PNG_SIGNATURE);
  });
});
