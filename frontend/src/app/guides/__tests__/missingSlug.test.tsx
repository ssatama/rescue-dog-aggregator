import { notFound } from "next/navigation";
import GuidePage, { generateMetadata } from "@/app/guides/[slug]/page";
import { getGuide } from "@/lib/guides";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

describe("guide route for a slug with no mdx file", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves getGuide to null instead of throwing ENOENT", async () => {
    await expect(getGuide("how-to-adopt-a-rescue-dog")).resolves.toBeNull();
  });

  it("returns not-found metadata rather than throwing out of generateMetadata", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "how-to-adopt-a-rescue-dog" }),
    });

    expect(metadata.title).toBe("Guide Not Found | Rescue Dog Aggregator");
  });

  it("calls notFound() so the route answers 404, not 500", async () => {
    await expect(
      GuidePage({ params: Promise.resolve({ slug: "how-to-adopt-a-rescue-dog" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });
});
