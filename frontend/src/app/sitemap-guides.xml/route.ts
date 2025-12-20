import { getAllGuideSlugs } from "@/lib/guides";

export async function GET() {
  const slugs = getAllGuideSlugs();
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me";
  const now = new Date().toISOString();

  const urls = slugs.map((slug) => ({
    url: `${baseUrl}/guides/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  // Add guides listing page
  urls.unshift({
    url: `${baseUrl}/guides`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.9,
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls
    .map(
      ({ url, lastModified, changeFrequency, priority }) => `
  <url>
    <loc>${url}</loc>
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
