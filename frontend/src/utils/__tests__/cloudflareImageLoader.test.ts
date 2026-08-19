import cloudflareImageLoader from "../cloudflareImageLoader";

/**
 * next/image sends every image through Vercel's optimizer (/_next/image),
 * which is metered. Our dog images already live behind Cloudflare on
 * images.rescuedogs.me, where /cdn-cgi/image/ does the same resizing and
 * format negotiation for free:
 *
 *   origin JPEG                                     144,893 bytes
 *   /cdn-cgi/image/width=640,format=auto + Accept    32,523 bytes (avif)
 *
 * This loader routes R2 images to Cloudflare and leaves everything else
 * untouched, taking Vercel image transformations to ~zero.
 */

const R2 = "https://images.rescuedogs.me";
const PATH = "rescue_dogs/woof_project/rou_19c9cf1f.jpg";

const parseTransforms = (url: string): Record<string, string> => {
  const match = url.match(/\/cdn-cgi\/image\/([^/]+)\//);
  if (!match) throw new Error(`no cdn-cgi transform segment in: ${url}`);
  return Object.fromEntries(
    match[1].split(",").map((pair) => {
      const [k, v] = pair.split("=");
      return [k, v];
    }),
  );
};

describe("cloudflareImageLoader", () => {
  describe("R2-hosted images", () => {
    it("routes through the Cloudflare image endpoint", () => {
      const out = cloudflareImageLoader({ src: `${R2}/${PATH}`, width: 640 });

      expect(out).toBe(
        `${R2}/cdn-cgi/image/width=640,quality=75,format=auto/${PATH}`,
      );
    });

    it("passes the requested width through", () => {
      const out = cloudflareImageLoader({ src: `${R2}/${PATH}`, width: 1920 });

      expect(parseTransforms(out).width).toBe("1920");
    });

    it("honours an explicit quality", () => {
      const out = cloudflareImageLoader({
        src: `${R2}/${PATH}`,
        width: 640,
        quality: 90,
      });

      expect(parseTransforms(out).quality).toBe("90");
    });

    it("defaults quality to 75 when unspecified", () => {
      const out = cloudflareImageLoader({ src: `${R2}/${PATH}`, width: 640 });

      expect(parseTransforms(out).quality).toBe("75");
    });

    it("always requests format=auto", () => {
      // This zone ignores explicit format=webp/avif and only negotiates via
      // Accept when format=auto is used — verified against production.
      const out = cloudflareImageLoader({ src: `${R2}/${PATH}`, width: 640 });

      expect(parseTransforms(out).format).toBe("auto");
    });

    it("does not stack transforms on an already-transformed URL", () => {
      const preTransformed = `${R2}/cdn-cgi/image/width=256,quality=60/${PATH}`;

      const out = cloudflareImageLoader({ src: preTransformed, width: 640 });

      expect(out.match(/cdn-cgi/g)).toHaveLength(1);
      expect(parseTransforms(out).width).toBe("640");
      expect(out.endsWith(PATH)).toBe(true);
    });
  });

  describe("non-R2 sources are left alone", () => {
    it.each([
      ["local asset", "/placeholder_dog.svg"],
      ["local png", "/og-image.png"],
      ["flag CDN", "https://flagcdn.com/w40/gb.png"],
      ["third-party host", "https://img1.wsimg.com/isteam/photo.jpg"],
    ])("returns %s unchanged", (_label, src) => {
      expect(cloudflareImageLoader({ src, width: 640 })).toBe(src);
    });

    it("never emits a Vercel optimizer URL", () => {
      const out = cloudflareImageLoader({
        src: "https://flagcdn.com/w40/gb.png",
        width: 640,
      });

      expect(out).not.toContain("/_next/image");
    });
  });

  describe("degenerate input", () => {
    it("returns an empty src unchanged rather than throwing", () => {
      expect(cloudflareImageLoader({ src: "", width: 640 })).toBe("");
    });

    it("survives a width of zero", () => {
      expect(() =>
        cloudflareImageLoader({ src: `${R2}/${PATH}`, width: 0 }),
      ).not.toThrow();
    });
  });
});
