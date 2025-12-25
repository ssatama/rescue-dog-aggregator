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
 * Higher priority for dogs with better content (LLM descriptions, images, recent listings)
 * Lower priority for adopted dogs (preserves backlink equity but saves crawl budget)
 * @param {Object} dog - Dog data object
 * @returns {number} Priority value between 0.3 and 1.0
 */
const calculateDogPriority = (dog) => {
  // Adopted and unknown status dogs get reduced priority to save crawl budget
  // They still appear in sitemap to preserve backlink equity
  // Unknown = dogs not seen in recent scrapes (consecutive_scrapes_missing >= 3)
  if (dog.status === "adopted" || dog.status === "unknown") {
    return 0.5;
  }

  let priority = 0.3; // Base priority for all dogs

  // Check for LLM-enhanced content (highest priority signal)
  // Dogs with LLM descriptions are our best content
  const hasLLMDescription =
    dog.properties?.dog_profiler_data?.description ||
    dog.llm_description ||
    dog.dog_profiler_data?.description;

  const hasLLMTagline =
    dog.properties?.dog_profiler_data?.tagline ||
    dog.llm_tagline ||
    dog.dog_profiler_data?.tagline;

  if (hasLLMDescription || hasLLMTagline) {
    // +0.4 for having LLM-generated content (our highest quality content)
    priority += 0.4;
  } else {
    // Fallback to checking regular description quality
    // +0.1 to +0.3 for non-LLM description quality
    if (dog.properties && dog.properties.description) {
      const description = dog.properties.description;
      const descLength = description.length;

      // Check if it's not just boilerplate
      const isBoilerplate =
        description.includes("No description available") ||
        description.includes("Contact us for more information") ||
        description.length < 30;

      if (!isBoilerplate) {
        if (descLength > 200) {
          priority += 0.3; // Long, detailed description
        } else if (descLength > 50) {
          priority += 0.2; // Medium description
        } else if (descLength > 0) {
          priority += 0.1; // Short but present description
        }
      }
    }
  }

  // +0.2 for having a primary image
  if (dog.primary_image_url) {
    priority += 0.2;
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

  // Ensure priority stays within valid range
  // Dogs with LLM content can reach 1.0 priority
  // Round to 1 decimal place to avoid floating point precision issues
  return Math.min(Math.round(priority * 10) / 10, 1.0);
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
      url: `${baseUrl}/privacy`,
      changefreq: "yearly",
      priority: 0.3,
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
 * Convert sitemap entries to XML format
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
      // Format priority to avoid floating point precision issues (e.g., 0.9999999999)
      const formattedPriority = entry.priority.toFixed(1);
      urlXml += `    <priority>${formattedPriority}</priority>\n`;
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
 * Generate sitemap index XML listing all available sitemaps
 * If no sitemaps array provided, uses default list of all sitemaps
 * @param {Array<Object>} [sitemaps] - Optional array of sitemap metadata objects with {filename, lastmod?}
 * @returns {string} XML sitemap index content
 */
export const generateSitemapIndex = (sitemaps) => {
  // Use default sitemap list if none provided
  if (!sitemaps || sitemaps.length === 0) {
    const lastmod = new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
    sitemaps = [
      { filename: "sitemap.xml", lastmod },
      { filename: "sitemap-dogs.xml", lastmod },
      { filename: "sitemap-organizations.xml", lastmod },
      { filename: "sitemap-images.xml", lastmod },
      { filename: "sitemap-guides.xml", lastmod },
      { filename: "sitemap-breeds.xml", lastmod },
    ];
  }

  const baseUrl = getBaseUrl();
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const indexOpen =
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  const indexClose = "</sitemapindex>";

  const sitemapEntries = sitemaps.map((sitemap) => {
    const lastmod =
      sitemap.lastmod ||
      new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
    return `  <sitemap>
    <loc>${escapeXml(`${baseUrl}/${sitemap.filename}`)}</loc>
    <lastmod>${lastmod}</lastmod>
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
    // Note: Dog pages are in sitemap-dogs.xml to avoid duplication
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

    // Add breed pages
    try {
      const breedPages = await generateBreedPages();
      allEntries.push(...breedPages);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "Failed to generate breed pages for sitemap:",
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
 * Generate breed page entries for the sitemap
 * @returns {Promise<Array<Object>>} Array of breed page sitemap entries
 */
const generateBreedPages = async () => {
  const baseUrl = getBaseUrl();
  const breedPages = [];

  try {
    // Add main breeds hub page
    breedPages.push(
      formatSitemapEntry({
        url: `${baseUrl}/breeds`,
        changefreq: "weekly",
        priority: 0.9,
      }),
    );

    // Add mixed breeds consolidated page
    breedPages.push(
      formatSitemapEntry({
        url: `${baseUrl}/breeds/mixed`,
        changefreq: "weekly",
        priority: 0.85,
      }),
    );

    // Fetch breed stats to get qualifying breeds
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "https://api.rescuedogs.me"}/api/animals/breeds/stats`,
    );

    if (response.ok) {
      const breedStats = await response.json();

      // Add individual breed pages (excluding mixed breed variants)
      if (
        breedStats.qualifying_breeds &&
        Array.isArray(breedStats.qualifying_breeds)
      ) {
        const purebreds = breedStats.qualifying_breeds.filter((breed) => {
          // Exclude mixed breed variants that would redirect
          const isMixed =
            breed.breed_type === "mixed" ||
            breed.breed_group === "Mixed" ||
            breed.primary_breed?.toLowerCase().includes("mix");
          return !isMixed && breed.breed_slug;
        });

        purebreds.forEach((breed) => {
          // Calculate priority based on dog count (0.7 to 0.9 range)
          const counts = purebreds.map((b) => Number(b.count) || 0);
          const maxCount = counts.length ? Math.max(...counts) : 1;
          const normalizedCount =
            maxCount > 0 ? (Number(breed.count) || 0) / maxCount : 0;
          const priority = Math.min(
            0.9,
            Math.max(0.7, 0.7 + normalizedCount * 0.2),
          );

          const entry = {
            url: `${baseUrl}/breeds/${breed.breed_slug}`,
            changefreq: "weekly",
            priority: Math.round(priority * 10) / 10, // Round to 1 decimal
          };

          // Add lastmod if breed has been recently updated
          if (breed.last_updated) {
            const formattedDate = formatDateForSitemap(breed.last_updated);
            if (formattedDate) {
              entry.lastmod = formattedDate;
            }
          }

          breedPages.push(formatSitemapEntry(entry));
        });
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to fetch breed stats for sitemap:", error.message);
    }
  }

  return breedPages;
};

/**
 * Get sitemap statistics for monitoring
 * @returns {Promise<Object>} Sitemap generation stats
 */
export const getSitemapStats = async () => {
  try {
    const [dogs, organizations, breedPages] = await Promise.allSettled([
      getAllAnimalsForSitemap(),
      getAllOrganizations(),
      generateBreedPages(),
    ]);

    const dogCount = dogs.status === "fulfilled" ? dogs.value.length : 0;
    const orgCount =
      organizations.status === "fulfilled" ? organizations.value.length : 0;
    const breedCount =
      breedPages.status === "fulfilled" ? breedPages.value.length : 0;
    const staticCount = generateStaticPages().length;

    return {
      totalUrls: staticCount + dogCount + orgCount + breedCount,
      staticPages: staticCount,
      dogPages: dogCount,
      organizationPages: orgCount,
      breedPages: breedCount,
      lastGenerated: new Date().toISOString(),
    };
  } catch (error) {
    return {
      totalUrls: generateStaticPages().length,
      staticPages: generateStaticPages().length,
      dogPages: 0,
      organizationPages: 0,
      breedPages: 0,
      lastGenerated: new Date().toISOString(),
      error: error.message,
    };
  }
};