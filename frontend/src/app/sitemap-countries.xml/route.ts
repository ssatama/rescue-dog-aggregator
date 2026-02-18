import { generateCountrySitemap } from "../../utils/sitemap";

export async function GET(): Promise<Response> {
  try {
    const sitemap = await generateCountrySitemap();

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error: unknown) {
    const errorDetails =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: String(error) };

    console.error("Error generating country sitemap:", {
      ...errorDetails,
      timestamp: new Date().toISOString(),
      route: "/sitemap-countries.xml",
      type: "sitemap_generation_error",
    });

    const emptySitemap =
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';

    return new Response(emptySitemap, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }
}
