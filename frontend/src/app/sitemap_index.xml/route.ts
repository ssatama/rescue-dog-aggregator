import { generateSitemapIndex } from "../../utils/sitemap";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  try {
    const sitemapIndexXml = generateSitemapIndex();

    return new Response(sitemapIndexXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        Vary: "Accept-Encoding",
      },
    });
  } catch {
    const fallbackIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://www.rescuedogs.me/sitemap.xml</loc>
  </sitemap>
</sitemapindex>`;

    return new Response(fallbackIndex, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }
}
