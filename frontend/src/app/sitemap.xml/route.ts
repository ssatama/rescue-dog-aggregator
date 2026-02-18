import { unstable_noStore as noStore } from "next/cache";
import { generateSitemap } from "../../utils/sitemap";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(): Promise<Response> {
  noStore();

  try {
    const sitemapXml = await generateSitemap();

    return new Response(sitemapXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        Vary: "Accept-Encoding",
      },
    });
  } catch {
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me"}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(fallbackSitemap, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  }
}
