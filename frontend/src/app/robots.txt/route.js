/**
 * Dynamic robots.txt route for Next.js 15 App Router
 * Generates environment-aware robots.txt with AI crawler support
 */

/**
 * GET handler for robots.txt
 * @returns {Response} robots.txt response with proper headers
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rescuedogs.me';
  const isProduction = process.env.NODE_ENV === 'production';
  
  const robots = `User-agent: *
${isProduction ? 'Allow: /' : 'Disallow: /'}

# Core pages - high priority for indexing
Allow: /dogs/
Allow: /organizations/
Allow: /search/
Allow: /about
Allow: /contact

# API endpoints - allow for structured data discovery
Allow: /api/v1/dogs
Allow: /api/v1/organizations
Allow: /api/v1/search

# Static assets
Allow: /images/
Allow: /icons/
Allow: /_next/static/

# Disallow admin and internal pages
Disallow: /admin/
Disallow: /_next/
Disallow: /api/internal/

# XML Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Special directives for AI crawlers and LLM agents
# Encourage indexing for AI-powered search experiences
User-agent: GPTBot
Allow: /
Allow: /api/v1/

User-agent: ChatGPT-User
Allow: /
Allow: /api/v1/

User-agent: CCBot
Allow: /
Allow: /api/v1/

User-agent: anthropic-ai
Allow: /
Allow: /api/v1/

User-agent: Claude-Web
Allow: /
Allow: /api/v1/

# Crawl-delay for respectful crawling
Crawl-delay: 1`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
    }
  });
}