"""
Sitemap API endpoint for SEO preservation.

This module provides a sitemap endpoint that includes ALL dogs regardless of status,
ensuring adopted and reserved dogs remain indexed for SEO purposes.
"""

import logging
from datetime import datetime
from typing import Dict, List

from fastapi import APIRouter, Depends
from psycopg2.extras import RealDictCursor

from api.dependencies import get_pooled_db_cursor
from api.exceptions import APIException, handle_database_error

logger = logging.getLogger(__name__)

router = APIRouter(tags=["sitemap"])


@router.get("/sitemap", summary="Get sitemap with all dogs for SEO")
async def get_sitemap(
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
):  # Remove the type hint that might be causing validation issues
    """
    Get sitemap data for all dogs regardless of status.

    This endpoint returns ALL dogs (available, unknown, adopted, reserved) to preserve
    SEO value. Adopted dogs show celebration pages, reserved dogs show pending status.

    Returns:
        Dictionary with 'urls' containing sitemap entries with:
        - loc: Relative URL path to dog detail page
        - lastmod: Last modification date
        - changefreq: Update frequency hint for crawlers
        - priority: Crawl priority (higher for available dogs)
    """
    try:
        # Query ALL dogs for sitemap, not just available ones
        query = """
            SELECT 
                a.id,
                a.slug,
                a.status,
                a.updated_at,
                a.created_at,
                a.last_scraped_at,
                a.dog_profiler_data,
                o.slug as org_slug
            FROM animals a
            LEFT JOIN organizations o ON a.organization_id = o.id
            WHERE a.animal_type = 'dog'
              AND o.active = TRUE
            ORDER BY a.id DESC
        """

        cursor.execute(query)
        dogs = cursor.fetchall()

        urls = []
        for dog in dogs:
            # Use slug-based URLs for better SEO
            url_path = f"/dogs/{dog['slug']}" if dog["slug"] else f"/dogs/{dog['id']}"

            # Determine update frequency based on status
            if dog["status"] == "available":
                changefreq = "daily"
                priority = 0.8
            elif dog["status"] == "unknown":
                changefreq = "weekly"
                priority = 0.6
            elif dog["status"] in ["adopted", "reserved"]:
                changefreq = "monthly"
                priority = 0.4
            else:
                changefreq = "weekly"
                priority = 0.5

            # Use most recent update time
            lastmod = dog["updated_at"] or dog["last_scraped_at"] or dog["created_at"]

            # Only include dogs with quality content for better SEO
            # Check if dog has profiler data with good quality score
            include_in_sitemap = True
            if dog.get("dog_profiler_data"):
                quality_score = dog["dog_profiler_data"].get("quality_score", 0)
                # Include if quality score is good or if dog is adopted/reserved (celebration pages)
                include_in_sitemap = quality_score > 0.5 or dog["status"] in ["adopted", "reserved"]

            if include_in_sitemap:
                urls.append(
                    {
                        "loc": url_path,
                        "lastmod": lastmod.isoformat() if lastmod else datetime.now().isoformat(),
                        "changefreq": changefreq,
                        "priority": priority,
                        "status": dog["status"],  # Include status for frontend to handle appropriately
                    }
                )

        logger.info(f"Generated sitemap with {len(urls)} dogs")

        # Also include organization pages and static pages
        static_urls = [
            {"loc": "/", "changefreq": "daily", "priority": 1.0},
            {"loc": "/dogs", "changefreq": "daily", "priority": 0.9},
            {"loc": "/organizations", "changefreq": "weekly", "priority": 0.7},
            {"loc": "/about", "changefreq": "monthly", "priority": 0.5},
            {"loc": "/contact", "changefreq": "monthly", "priority": 0.5},
        ]

        # Get organization slugs for their pages
        org_query = """
            SELECT slug, updated_at
            FROM organizations
            WHERE active = TRUE
            ORDER BY name
        """
        cursor.execute(org_query)
        orgs = cursor.fetchall()

        for org in orgs:
            static_urls.append(
                {"loc": f"/organizations/{org['slug']}", "lastmod": org["updated_at"].isoformat() if org["updated_at"] else datetime.now().isoformat(), "changefreq": "weekly", "priority": 0.6}
            )

        return {
            "urls": urls,
            "static_urls": static_urls,
            "total_dogs": len(urls),
            "stats": {
                "available": sum(1 for u in urls if u.get("status") == "available"),
                "unknown": sum(1 for u in urls if u.get("status") == "unknown"),
                "adopted": sum(1 for u in urls if u.get("status") == "adopted"),
                "reserved": sum(1 for u in urls if u.get("status") == "reserved"),
            },
        }

    except Exception as e:
        logger.error(f"Error generating sitemap: {e}")
        handle_database_error(e, "generating sitemap")
        raise APIException(status_code=500, detail="Failed to generate sitemap", error_code="SITEMAP_ERROR")


@router.get("/sitemap.xml", summary="Get XML sitemap for search engines")
async def get_sitemap_xml(
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
) -> str:
    """
    Get sitemap in XML format for search engine consumption.

    Returns standard sitemap.xml format that can be submitted to Google Search Console.
    """
    try:
        # Get sitemap data
        sitemap_data = await get_sitemap(cursor)

        # Build XML
        xml_parts = ['<?xml version="1.0" encoding="UTF-8"?>']
        xml_parts.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

        base_url = "https://www.rescuedogs.me"  # Production URL

        # Add all dog URLs
        for url in sitemap_data["urls"]:
            xml_parts.append("  <url>")
            xml_parts.append(f"    <loc>{base_url}{url['loc']}</loc>")
            xml_parts.append(f"    <lastmod>{url['lastmod']}</lastmod>")
            xml_parts.append(f"    <changefreq>{url['changefreq']}</changefreq>")
            xml_parts.append(f"    <priority>{url['priority']}</priority>")
            xml_parts.append("  </url>")

        # Add static URLs
        for url in sitemap_data.get("static_urls", []):
            xml_parts.append("  <url>")
            xml_parts.append(f"    <loc>{base_url}{url['loc']}</loc>")
            if "lastmod" in url:
                xml_parts.append(f"    <lastmod>{url['lastmod']}</lastmod>")
            xml_parts.append(f"    <changefreq>{url['changefreq']}</changefreq>")
            xml_parts.append(f"    <priority>{url['priority']}</priority>")
            xml_parts.append("  </url>")

        xml_parts.append("</urlset>")

        return "\n".join(xml_parts)

    except Exception as e:
        logger.error(f"Error generating XML sitemap: {e}")
        raise APIException(status_code=500, detail="Failed to generate XML sitemap", error_code="SITEMAP_XML_ERROR")
