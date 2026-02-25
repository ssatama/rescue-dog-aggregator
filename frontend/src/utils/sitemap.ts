import { getAllAnimalsForSitemap } from "../services/animalsService";
import { getAllOrganizations } from "../services/organizationsService";

const getBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me";

interface SitemapDog {
  id: number | string;
  slug?: string;
  name?: string;
  breed?: string;
  primary_image_url?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
}

interface SitemapOrganization {
  id?: number | string;
  slug?: string;
  updated_at?: string;
}

interface SitemapEntry {
  url: string;
  lastmod?: string;
}

interface SitemapMetadata {
  filename: string;
  lastmod?: string;
}

const MAX_URLS_PER_SITEMAP = 50000;

export const formatSitemapEntry = (entry: SitemapEntry): SitemapEntry => {
  if (!entry || typeof entry !== "object") {
    throw new Error("Sitemap entry must be an object");
  }

  if (!entry.url || typeof entry.url !== "string" || entry.url.trim() === "") {
    throw new Error("Sitemap entry must have a valid URL");
  }

  try {
    new URL(entry.url);
  } catch {
    throw new Error("Sitemap entry URL must be a valid URL");
  }

  const validatedEntry: SitemapEntry = {
    url: entry.url,
  };

  if (entry.lastmod) {
    validatedEntry.lastmod = entry.lastmod;
  }

  return validatedEntry;
};

const generateStaticPages = (): SitemapEntry[] => {
  const baseUrl = getBaseUrl();
  const staticPages: SitemapEntry[] = [
    { url: `${baseUrl}/` },
    { url: `${baseUrl}/dogs` },
    { url: `${baseUrl}/dogs/age` },
    { url: `${baseUrl}/dogs/puppies` },
    { url: `${baseUrl}/dogs/senior` },
    { url: `${baseUrl}/organizations` },
    { url: `${baseUrl}/about` },
    { url: `${baseUrl}/faq` },
    { url: `${baseUrl}/privacy` },
    { url: `${baseUrl}/swipe` },
  ];

  return staticPages.map(formatSitemapEntry);
};

const generateDogPages = (dogs: SitemapDog[]): SitemapEntry[] => {
  if (!Array.isArray(dogs)) {
    return [];
  }

  const baseUrl = getBaseUrl();
  return dogs.map((dog) => {
    const entry: SitemapEntry = {
      url: `${baseUrl}/dogs/${dog.slug || `unknown-dog-${dog.id}`}`,
    };

    if (dog.created_at) {
      const formattedDate = formatDateForSitemap(dog.created_at);
      if (formattedDate) {
        entry.lastmod = formattedDate;
      }
    } else if (dog.updated_at) {
      const formattedDate = formatDateForSitemap(dog.updated_at);
      if (formattedDate) {
        entry.lastmod = formattedDate;
      }
    }

    return formatSitemapEntry(entry);
  });
};

const generateOrganizationPages = (organizations: SitemapOrganization[]): SitemapEntry[] => {
  if (!Array.isArray(organizations)) {
    return [];
  }

  const baseUrl = getBaseUrl();
  return organizations.map((org) => {
    const entry: SitemapEntry = {
      url: `${baseUrl}/organizations/${org.slug || `unknown-org-${org.id}`}`,
    };

    if (org.updated_at) {
      const formattedDate = formatDateForSitemap(org.updated_at);
      if (formattedDate) {
        entry.lastmod = formattedDate;
      }
    }

    return formatSitemapEntry(entry);
  });
};

const entriesToXml = (entries: SitemapEntry[]): string => {
  if (!Array.isArray(entries)) {
    entries = [];
  }

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

    urlXml += "  </url>";
    return urlXml;
  });

  return [xmlHeader, urlsetOpen, ...urlElements, urlsetClose].join("\n");
};

export const formatDateForSitemap = (dateString: string | null | undefined): string | null => {
  if (!dateString) return null;

  try {
    let date: Date;

    if (
      dateString.includes("T") &&
      !dateString.includes("Z") &&
      !dateString.includes("+") &&
      !dateString.includes("-", 10)
    ) {
      date = new Date(dateString + "Z");
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
  } catch {
    return null;
  }
};

export const escapeXml = (str: string): string => {
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

export const generateSitemapIndex = (sitemaps?: SitemapMetadata[]): string => {
  if (!sitemaps || sitemaps.length === 0) {
    const lastmod = new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
    sitemaps = [
      { filename: "sitemap.xml", lastmod },
      { filename: "sitemap-dogs.xml", lastmod },
      { filename: "sitemap-organizations.xml", lastmod },
      { filename: "sitemap-countries.xml", lastmod },
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

export const generateSitemap = async (): Promise<string> => {
  const staticEntries = generateStaticPages();
  return entriesToXml(staticEntries);
};

export const generateDogSitemap = async (): Promise<string> => {
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

export const generateOrganizationSitemap = async (): Promise<string> => {
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

export const generateCountrySitemap = async (): Promise<string> => {
  const baseUrl = getBaseUrl();
  const countries = ["uk", "de", "sr", "ba", "bg", "it", "tr", "cy"];

  try {
    const countryEntries = [
      formatSitemapEntry({
        url: `${baseUrl}/dogs/country`,
      }),
      ...countries.map((code) =>
        formatSitemapEntry({
          url: `${baseUrl}/dogs/country/${code}`,
        })
      ),
    ];

    return entriesToXml(countryEntries);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error generating country sitemap:", error);
    }
    return entriesToXml([]);
  }
};

export const generateImageSitemap = async (): Promise<string> => {
  const baseUrl = getBaseUrl();
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const urlsetOpen =
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">';
  const urlsetClose = "</urlset>";

  try {
    const dogs = await getAllAnimalsForSitemap();

    const imageEntries = dogs
      .filter((dog) => dog.primary_image_url)
      .map((dog) => {
        const dogUrl = `${baseUrl}/dogs/${dog.slug || `unknown-dog-${dog.id}`}`;
        const imageTitle = `${dog.name} - ${dog.breed || "Mixed Breed"} for Adoption`;
        const imageCaption = dog.description
          ? dog.description.substring(0, 200)
          : `Meet ${dog.name}, available for adoption`;

        return `  <url>
    <loc>${escapeXml(dogUrl)}</loc>
    <image:image>
      <image:loc>${escapeXml(dog.primary_image_url!)}</image:loc>
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

interface BreedStatsBreed {
  breed_type?: string;
  breed_group?: string;
  primary_breed?: string;
  breed_slug?: string;
  last_updated?: string;
}

export const generateBreedPages = async (): Promise<SitemapEntry[]> => {
  const baseUrl = getBaseUrl();
  const breedPages: SitemapEntry[] = [];

  try {
    breedPages.push(
      formatSitemapEntry({
        url: `${baseUrl}/breeds`,
      }),
    );

    breedPages.push(
      formatSitemapEntry({
        url: `${baseUrl}/breeds/mixed`,
      }),
    );

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "https://api.rescuedogs.me"}/api/animals/breeds/stats`,
    );

    if (response.ok) {
      const breedStats: { qualifying_breeds?: BreedStatsBreed[] } = await response.json();

      if (
        breedStats.qualifying_breeds &&
        Array.isArray(breedStats.qualifying_breeds)
      ) {
        const seenSlugs = new Set<string>();
        const purebreds = breedStats.qualifying_breeds.filter((breed) => {
          const isMixed =
            breed.breed_type === "mixed" ||
            breed.breed_group === "Mixed" ||
            breed.primary_breed?.toLowerCase().includes("mix");
          if (isMixed || !breed.breed_slug) return false;
          if (seenSlugs.has(breed.breed_slug)) return false;
          seenSlugs.add(breed.breed_slug);
          return true;
        });

        purebreds.forEach((breed) => {
          const entry: SitemapEntry = {
            url: `${baseUrl}/breeds/${breed.breed_slug}`,
          };

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
      console.warn("Failed to fetch breed stats for sitemap:", error instanceof Error ? error.message : String(error));
    }
  }

  return breedPages;
};

interface SitemapStats {
  totalUrls: number;
  staticPages: number;
  dogPages: number;
  organizationPages: number;
  breedPages: number;
  lastGenerated: string;
  error?: string;
}

export const getSitemapStats = async (): Promise<SitemapStats> => {
  try {
    const [dogs, organizations, breedPagesResult] = await Promise.allSettled([
      getAllAnimalsForSitemap(),
      getAllOrganizations(),
      generateBreedPages(),
    ]);

    const dogCount = dogs.status === "fulfilled" ? dogs.value.length : 0;
    const orgCount =
      organizations.status === "fulfilled" ? organizations.value.length : 0;
    const breedCount =
      breedPagesResult.status === "fulfilled" ? breedPagesResult.value.length : 0;
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
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
