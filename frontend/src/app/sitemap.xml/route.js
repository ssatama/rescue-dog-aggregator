/**
 * Dynamic sitemap.xml generation with force-dynamic to bypass ISR issues
 */

import { generateSitemap } from '../../utils/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sitemapXml = await generateSitemap();

    return new Response(sitemapXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Allow edge caching
        'Vary': 'Accept-Encoding',
      },
    });
  } catch (error) {
    console.error('Sitemap generation failed:', error);
    
    // Return minimal sitemap on error
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${process.env.NEXT_PUBLIC_SITE_URL || 'https://rescuedogs.me'}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(fallbackSitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  }
}