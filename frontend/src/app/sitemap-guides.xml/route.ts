import { getAllGuides } from "@/lib/guides";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
  }
  return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

export async function GET() {
  const guides = await getAllGuides();
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me";

  const urls = guides.map((guide) => ({
    url: `${baseUrl}/guides/${escapeXml(guide.slug)}`,
    lastModified: formatDate(guide.frontmatter.lastUpdated),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const mostRecentDate = guides.reduce((latest, guide) => {
    const date = new Date(guide.frontmatter.lastUpdated);
    return date > latest ? date : latest;
  }, new Date(0));

  urls.unshift({
    url: `${baseUrl}/guides`,
    lastModified: formatDate(mostRecentDate.toISOString()),
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
}
