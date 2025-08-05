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

// Sitemap limits per Google standards
const MAX_URLS_PER_SITEMAP = 50000;

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
      priority: 0.8,
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
const getEuropeanLocales = () => [
  "en-GB",
  "en-IE",
  "en-DE",
  "en-FR",
  "en-IT",
  "en-ES",
  "en-NL",
  "en-BE",
  "en-AT",
  "en-PT",
  "en-SE",
  "en-DK",
  "en-FI",
  "en-NO",
  "en-CH",
  "en-PL",
  "en-CZ",
  "en-HU",
  "en-SK",
  "en-SI",
  "en-HR",
  "en-RO",
  "en-BG",
  "en-GR",
  "en-CY",
  "en-MT",
  "en-LU",
  "en-EE",
  "en-LV",
  "en-LT",
];

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
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';
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

    // Add hreflang alternates for European markets
    const hreflangAlternates = generateHreflangAlternates(entry.url);
    hreflangAlternates.forEach((alternate) => {
      urlXml += `    <xhtml:link rel="${alternate.rel}" hreflang="${alternate.hreflang}" href="${escapeXml(alternate.href)}" />\n`;
    });

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
