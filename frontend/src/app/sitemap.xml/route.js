/**
 * Dynamic sitemap.xml generation API route for Next.js 15 App Router
 * Generates XML sitemap with all dogs, organizations, and static pages
 */

import { generateSitemap } from '../../utils/sitemap';

// Force dynamic generation to bypass ISR caching issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const sitemapXml = await generateSitemap();

    return new Response(sitemapXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate', // No caching
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Sitemap generation failed:', error);
    
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
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300, s-maxage=300', // Shorter cache on error
      },
    });
  }
}