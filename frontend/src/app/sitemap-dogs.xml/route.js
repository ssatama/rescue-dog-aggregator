/**
 * Dynamic dog sitemap route for Next.js 15 App Router
 * Generates XML sitemap specifically for dog pages
 */

import { generateDogSitemap } from "../../utils/sitemap";

/**
 * GET handler for dog sitemap
 * @returns {Response} XML sitemap response
 */
export async function GET() {
  try {
    const sitemap = await generateDogSitemap();

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400", // 1 hour client, 24 hours CDN
      },
    });
  } catch (error) {
    console.error("Error generating dog sitemap:", error);

    // Return empty sitemap on error
    const emptySitemap =
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';

    return new Response(emptySitemap, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300", // 5 minutes on error
      },
    });
  }
}
