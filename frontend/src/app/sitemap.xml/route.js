/**
 * Dynamic sitemap.xml generation with unstable_noStore to bypass Full Route Cache
 */

import { unstable_noStore as noStore } from "next/cache";
import { generateSitemap } from "../../utils/sitemap";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  // Bypass Next.js Full Route Cache completely
  noStore();

  try {
    const sitemapXml = await generateSitemap();

    return new Response(sitemapXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate", // Force fresh generation
        Vary: "Accept-Encoding",
      },
    });
  } catch (error) {
    // Return minimal sitemap on error
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${process.env.NEXT_PUBLIC_SITE_URL || "https://rescuedogs.me"}/</loc>
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
