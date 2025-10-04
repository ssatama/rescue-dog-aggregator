"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { getOrganizations } from "../../services/organizationsService";
import { useTheme } from "../providers/ThemeProvider";

// World TopoJSON from reliable CDN (will filter to Europe countries)
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

// Map country codes to display names (single source of truth)
const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  UK: "United Kingdom",
  ES: "Spain",
  BA: "Bosnia and Herzegovina",
  BG: "Bulgaria",
  IT: "Italy",
  SR: "Serbia",
  TR: "Turkey",
  DE: "Germany",
  CY: "Cyprus",
};

// Reverse mapping for O(1) lookups (name → code)
const COUNTRY_NAME_TO_CODE: Record<string, string> = Object.entries(
  COUNTRY_CODE_TO_NAME
).reduce((acc, [code, name]) => {
  acc[name] = code;
  return acc;
}, {} as Record<string, string>);

// European country names to filter from world map
const EUROPEAN_COUNTRIES = new Set([
  "Albania",
  "Austria",
  "Belarus",
  "Belgium",
  "Bosnia and Herzegovina",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Iceland",
  "Ireland",
  "Italy",
  "Kosovo",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Moldova",
  "Montenegro",
  "Netherlands",
  "North Macedonia",
  "Norway",
  "Poland",
  "Portugal",
  "Romania",
  "Russia",
  "Serbia",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
  "Switzerland",
  "Turkey",
  "Ukraine",
  "United Kingdom",
]);

interface Organization {
  id: number;
  name: string;
  country: string;
}

interface OrganizationData {
  [countryCode: string]: Organization[];
}

export default function EuropeMap() {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [orgsByCountry, setOrgsByCountry] = useState<OrganizationData>({});
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setMapError(null);
    try {
      const response = await getOrganizations();
      const orgs = Array.isArray(response) ? response : [];

      if (!orgs.length) {
        console.warn("No organizations returned from API");
        setOrgsByCountry({});
        setLoading(false);
        return;
      }

      // Group organizations by country
      const grouped: OrganizationData = {};
      orgs.forEach((org: Organization) => {
        if (org.country) {
          if (!grouped[org.country]) {
            grouped[org.country] = [];
          }
          grouped[org.country].push(org);
        }
      });
      setOrgsByCountry(grouped);
    } catch (error) {
      console.error("Failed to load organization data", error);
      setMapError("Failed to load organization data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getOrgCount(countryCode: string): number {
    return orgsByCountry[countryCode]?.length || 0;
  }

  function getCountryFill(countryName: string, isDarkMode: boolean): string {
    // O(1) lookup using reverse mapping
    const countryCode = COUNTRY_NAME_TO_CODE[countryName];

    if (!countryCode) {
      return isDarkMode ? '#1F2937' : '#F3F4F6'; // gray-800 : gray-100
    }

    const orgCount = getOrgCount(countryCode);
    if (orgCount === 0) {
      return isDarkMode ? '#1F2937' : '#F3F4F6'; // gray-800 : gray-100
    }

    // Progressive orange gradient
    const opacityMap: Record<number, number> = {
      1: 0.3, // Light orange
      2: 0.6, // Medium orange
      3: 0.85, // Strong orange
    };

    const opacity = opacityMap[Math.min(orgCount, 3)] || 0.85;
    const baseColor = isDarkMode ? '251, 146, 60' : '249, 115, 22'; // orange-400 : orange-600

    return `rgba(${baseColor}, ${opacity})`;
  }

  function getCountryCodeFromName(countryName: string): string | null {
    return COUNTRY_NAME_TO_CODE[countryName] || null;
  }

  return (
    <section>
      <h2 className="text-5xl md:text-6xl font-bold text-gray-800 dark:text-gray-200 mb-8 text-center">
        Where We Help Dogs
      </h2>
      <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-4">
        Map shows organization home countries, not dog locations
      </p>
      <div className="relative max-w-5xl mx-auto">
        {/* Subtle background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-transparent dark:from-blue-950/10 rounded-3xl"></div>

        <div className="relative p-4 sm:p-6 md:p-8 lg:p-12">
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
            </div>
          ) : mapError ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-600 dark:text-red-400 mb-2">{mapError}</p>
                <button
                  onClick={fetchData}
                  className="text-orange-600 hover:text-orange-700 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                <ComposableMap
                  projection="geoMercator"
                  viewBox="0 0 800 600"
                  data-testid="europe-map"
                >
                  <ZoomableGroup center={[15, 55]} zoom={3}>
                    <Geographies geography={geoUrl}>
                      {({ geographies }) =>
                        geographies
                          .filter((geo) => EUROPEAN_COUNTRIES.has(geo.properties.name))
                          .map((geo) => {
                            const countryName = geo.properties.name;
                            const countryCode = getCountryCodeFromName(countryName);
                            const orgCount = countryCode ? getOrgCount(countryCode) : 0;

                            return (
                              <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                fill={getCountryFill(countryName, isDarkMode)}
                                stroke={isDarkMode ? '#374151' : '#E5E7EB'}
                                strokeWidth={0.5}
                                style={{
                                  default: {
                                    outline: 'none',
                                    transition: 'all 200ms ease-in-out',
                                  },
                                  hover: {
                                    outline: 'none',
                                    filter: 'brightness(1.1)',
                                    stroke: '#F97316',
                                    strokeWidth: 2,
                                    cursor: 'pointer',
                                  },
                                  pressed: {
                                    outline: 'none',
                                    filter: 'brightness(0.9)',
                                  }
                                }}
                                tabIndex={orgCount > 0 ? 0 : -1}
                                onMouseEnter={() => {
                                  if (orgCount > 0 && countryCode) {
                                    setHoveredCountry(countryCode);
                                  }
                                }}
                                onMouseLeave={() => setHoveredCountry(null)}
                                onFocus={() => {
                                  if (orgCount > 0 && countryCode) {
                                    setHoveredCountry(countryCode);
                                  }
                                }}
                                onBlur={() => setHoveredCountry(null)}
                                onKeyDown={(e) => {
                                  if (
                                    orgCount > 0 &&
                                    countryCode &&
                                    (e.key === "Enter" || e.key === " ")
                                  ) {
                                    e.preventDefault();
                                    setHoveredCountry(
                                      hoveredCountry === countryCode ? null : countryCode,
                                    );
                                  }
                                }}
                                className="transition-all duration-200 motion-reduce:transition-none focus-visible:outline-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                role="button"
                                aria-label={
                                  orgCount > 0
                                    ? `${COUNTRY_CODE_TO_NAME[countryCode!] || countryName}: ${orgCount} organization(s) based here`
                                    : countryName
                                }
                              />
                            );
                          })
                      }
                    </Geographies>
                  </ZoomableGroup>
                </ComposableMap>
              </div>

              {hoveredCountry && (
                <div className="absolute top-6 left-6 animate-in fade-in slide-in-from-left-2 duration-200 motion-reduce:animate-none">
                  <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                    {/* Orange accent border */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 to-orange-600"></div>

                    <div className="pl-5 pr-6 py-4">
                      <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
                        {COUNTRY_CODE_TO_NAME[hoveredCountry]}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                        <span className="text-orange-500">●</span>
                        {getOrgCount(hoveredCountry)} organization(s) based here
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}