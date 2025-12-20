export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me";
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "https://api.rescuedogs.me";
  const now = new Date().toISOString();

  const urls = [];

  urls.push({
    url: `${baseUrl}/breeds`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9,
  });

  urls.push({
    url: `${baseUrl}/breeds/mixed`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.85,
  });

  try {
    const response = await fetch(`${apiUrl}/api/animals/breeds/stats`);

    if (response.ok) {
      const breedStats = await response.json();

      if (
        breedStats.qualifying_breeds &&
        Array.isArray(breedStats.qualifying_breeds)
      ) {
        const indexableBreeds = breedStats.qualifying_breeds.filter((breed) => {
          const isMixed =
            breed.breed_type === "mixed" ||
            breed.breed_group === "Mixed" ||
            breed.primary_breed?.toLowerCase().includes("mix");
          return !isMixed && breed.breed_slug;
        });

        const counts = indexableBreeds.map((b) => Number(b.count) || 0);
        const maxCount = counts.length ? Math.max(...counts) : 1;

        indexableBreeds.forEach((breed) => {
          const normalizedCount =
            maxCount > 0 ? (Number(breed.count) || 0) / maxCount : 0;
          const priority = Math.min(0.9, Math.max(0.7, 0.7 + normalizedCount * 0.2));

          urls.push({
            url: `${baseUrl}/breeds/${breed.breed_slug}`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: Math.round(priority * 100) / 100,
          });
        });
      }
    }
  } catch (error) {
    console.error("Error fetching breed stats for sitemap:", error);
  }

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
  </url>`,
    )
    .join("")}
</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
