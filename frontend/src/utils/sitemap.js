/**
 * Dynamic sitemap generation utilities
 * Pure functions for generating SEO-optimized XML sitemaps
 */

import { getAllAnimalsForSitemap } from "../services/animalsService";
import { getAllOrganizations } from "../services/organizationsService";

/**
 * Get base URL dynamically for sitemap generation
 * @returns {string} Base URL for sitemap URLs
 */
const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me";
/**
 * Calculate dynamic priority for dog pages based on content quality attributes
 * Higher priority for dogs with better content (images, descriptions, recent listings)
 * @param {Object} dog - Dog data object
 * @returns {number} Priority value between 0.4 and 0.9
 */
const calculateDogPriority = (dog) => {
  let priority = 0.4; // Base priority for all dogs

  // +0.2 for having a primary image
  if (dog.primary_image_url) {
    priority += 0.2;
  }

  // +0.1 to +0.3 for description quality
  if (dog.properties && dog.properties.description) {
    const description = dog.properties.description;
    const descLength = description.length;

    if (descLength > 200) {
      priority += 0.3; // Long, detailed description
    } else if (descLength > 50) {
      priority += 0.2; // Medium description
    } else if (descLength > 0) {
      priority += 0.1; // Short but present description
    }
  }

  // +0.1 for recent listings (last 30 days)
  if (dog.created_at) {
    const createdDate = new Date(dog.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (createdDate > thirtyDaysAgo) {
      priority += 0.1;
    }
  }

  // Ensure priority doesn't exceed maximum
  return Math.min(priority, 0.9);
};

// Sitemap limits per Google standards
const MAX_URLS_PER_SITEMAP = 50000;
const MAX_SITEMAP_SIZE_MB = 50; // 50MB uncompressed

/**
 * Format and validate a single sitemap entry
 * @param {Object} entry - Sitemap entry data
 * @param {string} entry.url - Full URL for the page
 * @param {string} [entry.lastmod] - ISO 8601 format date
 * @param {string} [entry.changefreq] - How frequently the page changes
 * @param {number} [entry.priority] - Priority relative to other pages (0.0-1.0)
 * @returns {Object} Validated sitemap entry
 */
export const formatSitemapEntry = (entry) => {
  if (!entry || typeof entry !== "object") {
    throw new Error("Sitemap entry must be an object");
  }

  if (!entry.url || typeof entry.url !== "string" || entry.url.trim() === "") {
    throw new Error("Sitemap entry must have a valid URL");
  }

  // Validate URL format
  try {
    new URL(entry.url);
  } catch {
    throw new Error("Sitemap entry URL must be a valid URL");
  }

  // Validate priority if provided
  if (entry.priority !== undefined) {
    if (
      typeof entry.priority !== "number" ||
      entry.priority < 0 ||
      entry.priority > 1
    ) {
      throw new Error("Priority must be a number between 0.0 and 1.0");
    }
  }

  // Validate changefreq if provided
  if (entry.changefreq !== undefined) {
    const validFreqs = [
      "always",
      "hourly",
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "never",
    ];
    if (!validFreqs.includes(entry.changefreq)) {
      throw new Error(`changefreq must be one of: ${validFreqs.join(", ")}`);
    }
  }

  const validatedEntry = {
    url: entry.url,
  };

  // Add optional fields only if they exist
  if (entry.lastmod) {
    validatedEntry.lastmod = entry.lastmod;
  }

  if (entry.changefreq) {
    validatedEntry.changefreq = entry.changefreq;
  }

  if (entry.priority !== undefined) {
    validatedEntry.priority = entry.priority;
  }

  return validatedEntry;
};

/**
 * Generate static page entries for the sitemap
 * @returns {Array<Object>} Array of static page sitemap entries
 */
const generateStaticPages = () => {
  const baseUrl = getBaseUrl();
  const staticPages = [
    {
      url: `${baseUrl}/`,
      changefreq: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/dogs`,
      changefreq: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/organizations`,
      changefreq: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      changefreq: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      changefreq: "monthly",
      priority: 0.5,
    },
  ];

  return staticPages.map(formatSitemapEntry);
};

/**
 * Generate dog page entries for the sitemap
 * @param {Array<Object>} dogs - Array of dog objects from API
 * @returns {Array<Object>} Array of dog page sitemap entries
 */
const generateDogPages = (dogs) => {
  if (!Array.isArray(dogs)) {
    return [];
  }

  const baseUrl = getBaseUrl();
  return dogs.map((dog) => {
    const entry = {
      url: `${baseUrl}/dogs/${dog.slug || `unknown-dog-${dog.id}`}`,
      changefreq: "monthly", // Dog info rarely changes unless rescues update
      priority: calculateDogPriority(dog), // PHASE 2A: Dynamic priority calculation
    };

    // Add lastmod using created_at (when dog was first posted) instead of updated_at
    if (dog.created_at) {
      const formattedDate = formatDateForSitemap(dog.created_at);
      if (formattedDate) {
        entry.lastmod = formattedDate;
      }
    } else if (dog.updated_at) {
      // Fallback to updated_at if created_at is not available
      const formattedDate = formatDateForSitemap(dog.updated_at);
      if (formattedDate) {
        entry.lastmod = formattedDate;
      }
    }

    return formatSitemapEntry(entry);
  });
};

/**
 * Generate organization page entries for the sitemap
 * @param {Array<Object>} organizations - Array of organization objects from API
 * @returns {Array<Object>} Array of organization page sitemap entries
 */
const generateOrganizationPages = (organizations) => {
  if (!Array.isArray(organizations)) {
    return [];
  }

  const baseUrl = getBaseUrl();
  return organizations.map((org) => {
    const entry = {
      url: `${baseUrl}/organizations/${org.slug || `unknown-org-${org.id}`}`,
      changefreq: "monthly", // Organizations rarely change
      priority: 0.7,
    };

    // Add lastmod if available
    if (org.updated_at) {
      const formattedDate = formatDateForSitemap(org.updated_at);
      if (formattedDate) {
        entry.lastmod = formattedDate;
      }
    }

    return formatSitemapEntry(entry);
  });
};

/**
 * Get European locales for hreflang tags
 * @returns {Array<string>} Array of European locale codes
 */
// getEuropeanLocales function removed - no longer needed without hreflang

/**
 * Generate hreflang alternate URLs for European markets
 * @param {string} baseUrl - Base URL without locale
 * @returns {Array<Object>} Array of hreflang alternate entries
 */
const generateHreflangAlternates = (baseUrl) => {
  const locales = getEuropeanLocales();
  return locales.map((locale) => ({
    rel: "alternate",
    hreflang: locale,
    href: `${getBaseUrl()}/${locale}${baseUrl.replace(getBaseUrl(), "")}`,
  }));
};

/**
 * Convert sitemap entries to XML format with European hreflang support
 * @param {Array<Object>} entries - Array of validated sitemap entries
 * @returns {string} XML sitemap content
 */
const entriesToXml = (entries) => {
  if (!Array.isArray(entries)) {
    entries = [];
  }

  // Limit entries to sitemap standard
  const limitedEntries = entries.slice(0, MAX_URLS_PER_SITEMAP);

  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const urlsetOpen =
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  const urlsetClose = "</urlset>";

  const urlElements = limitedEntries.map((entry) => {
    let urlXml = "  <url>\n";
    urlXml += `    <loc>${escapeXml(entry.url)}</loc>\n`;

    if (entry.lastmod) {
      urlXml += `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n`;
    }

    if (entry.changefreq) {
      urlXml += `    <changefreq>${escapeXml(entry.changefreq)}</changefreq>\n`;
    }

    if (entry.priority !== undefined) {
      urlXml += `    <priority>${entry.priority}</priority>\n`;
    }

    // Note: hreflang alternates removed as site doesn't support internationalization
    // Adding non-existent locale URLs would create 404 errors for search crawlers

    urlXml += "  </url>";
    return urlXml;
  });

  return [xmlHeader, urlsetOpen, ...urlElements, urlsetClose].join("\n");
};

/**
 * Format date for XML sitemap (W3C Datetime format)
 * @param {string} dateString - Date string from API
 * @returns {string|null} Formatted date for sitemap or null if invalid
 */
export const formatDateForSitemap = (dateString) => {
  if (!dateString) return null;

  try {
    let date;

    // Handle API dates that don't have timezone info - assume UTC
    if (
      dateString.includes("T") &&
      !dateString.includes("Z") &&
      !dateString.includes("+") &&
      !dateString.includes("-", 10)
    ) {
      // Add Z to indicate UTC for timezone-less ISO strings
      date = new Date(dateString + "Z");
    } else {
      date = new Date(dateString);
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    // Convert to W3C Datetime format (ISO 8601 with timezone)
    // Remove milliseconds and add +00:00 timezone
    return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
  } catch (error) {
    return null;
  }
};

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} XML-escaped string
 */
const escapeXml = (str) => {
  if (typeof str !== "string") {
    return "";
  }

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
};

/**
 * Generate sitemap index for multiple sitemaps
 * @param {Array<Object>} sitemaps - Array of sitemap metadata
 * @returns {string} XML sitemap index content
 */
const generateSitemapIndex = (sitemaps) => {
  const baseUrl = getBaseUrl();
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const indexOpen =
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  const indexClose = "</sitemapindex>";

  const sitemapEntries = sitemaps.map((sitemap) => {
    return `  <sitemap>
    <loc>${escapeXml(`${baseUrl}/${sitemap.filename}`)}</loc>
    <lastmod>${new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00")}</lastmod>
  </sitemap>`;
  });

  return [xmlHeader, indexOpen, ...sitemapEntries, indexClose].join("\n");
};

/**
 * Split entries into multiple sitemaps if needed
 * @param {Array<Object>} entries - All sitemap entries
 * @returns {Array<Object>} Array of sitemap chunks
 */
const splitIntoSitemaps = (entries) => {
  const sitemaps = [];
  let currentSitemap = [];
  let currentSize = 0;

  // Estimate 200 bytes per URL entry
  const BYTES_PER_ENTRY = 200;
  const MAX_SIZE_BYTES = MAX_SITEMAP_SIZE_MB * 1024 * 1024;

  for (const entry of entries) {
    const entrySize = BYTES_PER_ENTRY;

    // Check if adding this entry would exceed limits
    if (
      currentSitemap.length >= MAX_URLS_PER_SITEMAP ||
      currentSize + entrySize > MAX_SIZE_BYTES
    ) {
      // Start a new sitemap
      if (currentSitemap.length > 0) {
        sitemaps.push(currentSitemap);
        currentSitemap = [];
        currentSize = 0;
      }
    }

    currentSitemap.push(entry);
    currentSize += entrySize;
  }

  // Add the last sitemap if it has entries
  if (currentSitemap.length > 0) {
    sitemaps.push(currentSitemap);
  }

  return sitemaps;
};

/**
 * Generate complete XML sitemap with all content
 * @returns {Promise<string>} Complete XML sitemap content
 */
export const generateSitemap = async () => {
  try {
    // Collect all sitemap entries
    const allEntries = [];

    // Add static pages
    allEntries.push(...generateStaticPages());

    // Fetch and add dynamic content
    try {
      const dogs = await getAllAnimalsForSitemap();
      allEntries.push(...generateDogPages(dogs));
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to fetch dogs for sitemap:", error.message);
      }
    }

    try {
      const organizations = await getAllOrganizations();
      allEntries.push(...generateOrganizationPages(organizations));
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "Failed to fetch organizations for sitemap:",
          error.message,
        );
      }
    }

    // Convert to XML
    return entriesToXml(allEntries);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error generating sitemap:", error);
    }

    // Fallback: return sitemap with static pages only
    const staticEntries = generateStaticPages();
    return entriesToXml(staticEntries);
  }
};

/**
 * Generate dog-specific sitemap
 * @returns {Promise<string>} XML sitemap for dogs
 */
export const generateDogSitemap = async () => {
  try {
    const dogs = await getAllAnimalsForSitemap();
    const dogEntries = generateDogPages(dogs);
    return entriesToXml(dogEntries);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error generating dog sitemap:", error);
    }
    return entriesToXml([]);
  }
};

/**
 * Generate organization-specific sitemap
 * @returns {Promise<string>} XML sitemap for organizations
 */
export const generateOrganizationSitemap = async () => {
  try {
    const organizations = await getAllOrganizations();
    const orgEntries = generateOrganizationPages(organizations);
    return entriesToXml(orgEntries);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error generating organization sitemap:", error);
    }
    return entriesToXml([]);
  }
};

/**
 * Generate image sitemap for better image SEO
 * @returns {Promise<string>} XML image sitemap
 */
export const generateImageSitemap = async () => {
  const baseUrl = getBaseUrl();
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const urlsetOpen =
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">';
  const urlsetClose = "</urlset>";

  try {
    const dogs = await getAllAnimalsForSitemap();

    // Filter dogs with images and create image entries
    const imageEntries = dogs
      .filter((dog) => dog.primary_image_url)
      .slice(0, 1000) // Limit to 1000 most recent dogs with images
      .map((dog) => {
        const dogUrl = `${baseUrl}/dogs/${dog.slug || `unknown-dog-${dog.id}`}`;
        const imageTitle = `${dog.name} - ${dog.breed || "Mixed Breed"} for Adoption`;
        const imageCaption = dog.properties?.description
          ? dog.properties.description.substring(0, 200)
          : `Meet ${dog.name}, available for adoption`;

        return `  <url>
    <loc>${escapeXml(dogUrl)}</loc>
    <image:image>
      <image:loc>${escapeXml(dog.primary_image_url)}</image:loc>
      <image:title>${escapeXml(imageTitle)}</image:title>
      <image:caption>${escapeXml(imageCaption)}</image:caption>
    </image:image>
  </url>`;
      });

    return [xmlHeader, urlsetOpen, ...imageEntries, urlsetClose].join("\n");
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error generating image sitemap:", error);
    }
    return [xmlHeader, urlsetOpen, urlsetClose].join("\n");
  }
};

/**
 * Get sitemap statistics for monitoring
 * @returns {Promise<Object>} Sitemap generation stats
 */
export const getSitemapStats = async () => {
  try {
    const [dogs, organizations] = await Promise.allSettled([
      getAllAnimalsForSitemap(),
      getAllOrganizations(),
    ]);

    const dogCount = dogs.status === "fulfilled" ? dogs.value.length : 0;
    const orgCount =
      organizations.status === "fulfilled" ? organizations.value.length : 0;
    const staticCount = generateStaticPages().length;

    return {
      totalUrls: staticCount + dogCount + orgCount,
      staticPages: staticCount,
      dogPages: dogCount,
      organizationPages: orgCount,
      lastGenerated: new Date().toISOString(),
    };
  } catch (error) {
    return {
      totalUrls: generateStaticPages().length,
      staticPages: generateStaticPages().length,
      dogPages: 0,
      organizationPages: 0,
      lastGenerated: new Date().toISOString(),
      error: error.message,
    };
  }
};
