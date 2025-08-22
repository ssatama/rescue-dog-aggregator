/**
 * Dynamic organization sitemap route for Next.js 15 App Router
 * Generates XML sitemap specifically for organization pages
 */

import { generateOrganizationSitemap } from "../../utils/sitemap";

/**
 * GET handler for organization sitemap
 * @returns {Response} XML sitemap response
 */
export async function GET() {
  try {
    const sitemap = await generateOrganizationSitemap();

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400", // 1 hour client, 24 hours CDN
      },
    });
  } catch (error) {
    // Enhanced error logging with context
    console.error("Error generating organization sitemap:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      route: "/sitemap-organizations.xml",
      type: "sitemap_generation_error",
    });

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
