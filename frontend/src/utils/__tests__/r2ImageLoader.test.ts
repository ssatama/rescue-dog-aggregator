import r2ImageLoader, { nearestVariantWidth, r2VariantUrl } from "../r2ImageLoader";

/**
 * Images are served as pre-generated WebP variants, never through a billed
 * resizer (Cloudflare /cdn-cgi/image/ or Vercel /_next/image) (#761).
 */
const R2 = "https://images.rescuedogs.me";
const PATH = "rescue_dogs/woof_project/rou_19c9cf1f";

describe("r2ImageLoader", () => {
  it.each([
    [32, 320],
    [320, 320],
    [384, 640],
    [640, 640],
    [1080, 1200],
    [1920, 1200],
  ])("asks for %ipx and gets the %ipx variant", (requested, variant) => {
    expect(r2ImageLoader({ src: `${R2}/${PATH}.jpg`, width: requested })).toBe(`${R2}/${PATH}_w${variant}.webp`);
  });

  it("never builds a transformation URL", () => {
    expect(r2ImageLoader({ src: `${R2}/${PATH}.jpg`, width: 640, quality: 90 })).not.toContain("cdn-cgi");
  });

  it("unwraps a URL that already carries a Cloudflare transformation", () => {
    const transformed = `${R2}/cdn-cgi/image/width=256,quality=60/${PATH}.jpg`;
    expect(r2ImageLoader({ src: transformed, width: 640 })).toBe(`${R2}/${PATH}_w640.webp`);
  });

  it("handles other extensions, no extension and query strings", () => {
    expect(r2VariantUrl(`${R2}/rescue_dogs/organizations/logo.png`, 64)).toBe(`${R2}/rescue_dogs/organizations/logo_w320.webp`);
    expect(r2VariantUrl(`${R2}/rescue_dogs/x/rex`, 640)).toBe(`${R2}/rescue_dogs/x/rex_w640.webp`);
    expect(r2VariantUrl(`${R2}/${PATH}.jpg?v=2`, 640)).toBe(`${R2}/${PATH}_w640.webp`);
  });

  it("leaves non-R2 images untouched", () => {
    for (const src of ["/placeholder_dog.svg", "https://flagcdn.com/w40/de.png", "https://www.dogstrust.org.uk/a.jpg"]) {
      expect(r2ImageLoader({ src, width: 640 })).toBe(src);
    }
  });

  it("caps at the widest variant", () => {
    expect(nearestVariantWidth(5000)).toBe(1200);
  });
});
