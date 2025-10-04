"use client";

import { useState, useEffect } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { getOrganizations } from "../../services/organizationsService";

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

  useEffect(() => {
    async function fetchData() {
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
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function getOrgCount(countryCode: string): number {
    return orgsByCountry[countryCode]?.length || 0;
  }

  function getCountryFill(countryName: string): string {
    // Find country code for this country name
    const countryCode = Object.keys(COUNTRY_CODE_TO_NAME).find(
      (code) => COUNTRY_CODE_TO_NAME[code] === countryName,
    );

    if (!countryCode) {
      return "hsl(var(--muted))";
    }

    const orgCount = getOrgCount(countryCode);
    if (orgCount === 0) {
      return "hsl(var(--muted))";
    }

    // Orange gradient based on org count
    const opacity = Math.min(0.4 + orgCount * 0.3, 1.0);
    return `rgba(249, 115, 22, ${opacity})`; // Orange #F97316
  }

  function getCountryCodeFromName(countryName: string): string | null {
    const code = Object.keys(COUNTRY_CODE_TO_NAME).find(
      (key) => COUNTRY_CODE_TO_NAME[key] === countryName,
    );
    return code || null;
  }

  return (
    <section className="mb-16">
      <h2 className="text-5xl md:text-6xl font-bold text-gray-800 dark:text-gray-200 mb-8 text-center">
        Where We Help Dogs
      </h2>
      <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-4">
        Map shows organization home countries, not dog locations
      </p>
      <div className="relative max-w-4xl mx-auto">
        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
          </div>
        ) : (
          <>
            <ComposableMap
              projection="geoAzimuthalEqualArea"
              projectionConfig={{
                rotate: [-10.0, -52.0, 0],
                scale: 900,
              }}
              className="w-full h-auto"
              data-testid="europe-map"
            >
              <ZoomableGroup>
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
                            fill={getCountryFill(countryName)}
                            stroke="hsl(var(--border))"
                            strokeWidth={0.5}
                            style={{
                              default: { outline: "none" },
                              hover: { outline: "none", opacity: 0.8 },
                              pressed: { outline: "none" },
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
                            className="transition-opacity duration-200 cursor-pointer focus:outline-orange-500 focus:outline-offset-2"
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

            {hoveredCountry && (
              <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  {COUNTRY_CODE_TO_NAME[hoveredCountry] || hoveredCountry}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {getOrgCount(hoveredCountry)} organization(s) based here
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}