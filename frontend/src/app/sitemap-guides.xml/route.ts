import { getAllGuides } from "@/lib/guides";
import { escapeXml, formatDateForSitemap } from "../../utils/sitemap";

const EMPTY_SITEMAP =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>';

function nowFormatted(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

export async function GET() {
  try {
    const guides = await getAllGuides();
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me";

    const urls = guides.map((guide) => ({
      url: `${baseUrl}/guides/${escapeXml(guide.slug)}`,
      lastModified: formatDateForSitemap(guide.frontmatter.lastUpdated) ??
        nowFormatted(),
      changeFrequency: "monthly",
      priority: 0.8,
    }));

    const validDates = guides
      .map((guide) => new Date(guide.frontmatter.lastUpdated))
      .filter((date) => !isNaN(date.getTime()));

    const mostRecentDate = validDates.length > 0
      ? validDates.reduce((a, b) => (a > b ? a : b))
      : new Date();

    urls.unshift({
      url: `${baseUrl}/guides`,
      lastModified: formatDateForSitemap(mostRecentDate.toISOString()) ??
        nowFormatted(),
      changeFrequency: "monthly",
      priority: 0.9,
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls
      .map(
        ({ url, lastModified, changeFrequency, priority }) => `
  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority}</priority>
  </url>`
      )
      .join("")}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error generating guides sitemap:", {
      message,
      timestamp: new Date().toISOString(),
      route: "/sitemap-guides.xml",
      type: "sitemap_generation_error",
    });

    return new Response(EMPTY_SITEMAP, {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  }
}
