/**
 * Dynamic robots.txt route for Next.js 15 App Router
 * Generates environment-aware robots.txt with AI crawler support
 */

/**
 * GET handler for robots.txt
 * @returns {Response} robots.txt response with proper headers
 */
export async function GET() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me";
  const isProduction = process.env.NODE_ENV === "production";

  const robots = `# Robots.txt for Rescue Dog Aggregator
# Help rescue dogs find homes by maximizing search engine visibility
# Last-Modified: ${new Date().toUTCString()}

# === PRIORITY CRAWLERS - Maximum Speed ===

# Googlebot - Primary search engine
User-agent: Googlebot
Allow: /
Crawl-delay: 0

# Googlebot for images - Critical for dog photos
User-agent: Googlebot-Image
Allow: /
Crawl-delay: 0

# Bingbot - Microsoft's search engine
User-agent: Bingbot
Allow: /
Crawl-delay: 0

# DuckDuckGo
User-agent: DuckDuckBot
Allow: /
Crawl-delay: 0

# === SOCIAL & DISCOVERY BOTS ===

# Facebook
User-agent: facebookexternalhit
Allow: /

# Twitter/X
User-agent: Twitterbot
Allow: /

# Pinterest - Important for pet adoption sharing
User-agent: Pinterest
Allow: /

# LinkedIn
User-agent: LinkedInBot
Allow: /

# WhatsApp
User-agent: WhatsApp
Allow: /

# === AI & LLM CRAWLERS ===
# Maximize AI visibility for modern search experiences

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: CCBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: YouBot
Allow: /

# === ALL OTHER LEGITIMATE CRAWLERS ===

User-agent: *
${isProduction ? "Allow: /" : "Disallow: /"}

# Core pages - High priority
Allow: /dogs
Allow: /dogs/
Allow: /organizations
Allow: /organizations/
Allow: /search
Allow: /about
Allow: /contact

# Static assets - Explicitly allow
Allow: /images/
Allow: /icons/
Allow: /_next/static/
Allow: /_next/image
Allow: /favicon.ico
Allow: /manifest.json

# Disallow internal/admin pages
Disallow: /admin/
Disallow: /api/internal/
Disallow: /_next/data/
Disallow: /test/
Disallow: /staging/

# === AGGRESSIVE BOT CONTROL ===
# Block resource-wasting bots

User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: PetalBot
Disallow: /

# === SITEMAPS ===
# Multiple sitemaps for better organization

Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-dogs.xml
Sitemap: ${baseUrl}/sitemap-organizations.xml
Sitemap: ${baseUrl}/sitemap-images.xml

# === CRAWL BUDGET OPTIMIZATION ===
# Help search engines understand our structure
# Dogs: ~2000+ pages, updated weekly
# Organizations: ~10 pages, updated monthly
# Total indexed pages target: ~2500`;

  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400", // Cache for 24 hours
    },
  });
}
