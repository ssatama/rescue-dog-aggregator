import React, { useState } from "react";
import Image from "next/image";
import FlagErrorBoundary from "./FlagErrorBoundary";
import { normalizeCountryCode } from "../../utils/countries";

export type CountryFlagSize = "small" | "medium" | "large";

interface FlagSize {
  width: number;
  height: number;
  urlSize: string;
}

export interface CountryFlagProps {
  /** ISO 2-letter country code (e.g., 'TR', 'DE') */
  countryCode: string;
  /** Full country name for alt text */
  countryName?: string;
  /** Flag size: 'small' (default), 'medium', or 'large' */
  size?: CountryFlagSize;
  /** Additional CSS classes */
  className?: string;
}

// Size configurations for different flag dimensions
const FLAG_SIZES: Record<CountryFlagSize, FlagSize> = {
  small: { width: 20, height: 15, urlSize: "20x15" },
  medium: { width: 32, height: 24, urlSize: "32x24" },
  large: { width: 48, height: 36, urlSize: "48x36" },
};

// Known country codes that have flags available
const KNOWN_COUNTRY_CODES = new Set([
  "AD",
  "AE",
  "AF",
  "AG",
  "AI",
  "AL",
  "AM",
  "AO",
  "AQ",
  "AR",
  "AS",
  "AT",
  "AU",
  "AW",
  "AX",
  "AZ",
  "BA",
  "BB",
  "BD",
  "BE",
  "BF",
  "BG",
  "BH",
  "BI",
  "BJ",
  "BL",
  "BM",
  "BN",
  "BO",
  "BQ",
  "BR",
  "BS",
  "BT",
  "BV",
  "BW",
  "BY",
  "BZ",
  "CA",
  "CC",
  "CD",
  "CF",
  "CG",
  "CH",
  "CI",
  "CK",
  "CL",
  "CM",
  "CN",
  "CO",
  "CR",
  "CU",
  "CV",
  "CW",
  "CX",
  "CY",
  "CZ",
  "DE",
  "DJ",
  "DK",
  "DM",
  "DO",
  "DZ",
  "EC",
  "EE",
  "EG",
  "EH",
  "ER",
  "ES",
  "ET",
  "FI",
  "FJ",
  "FK",
  "FM",
  "FO",
  "FR",
  "GA",
  "GB",
  "GD",
  "GE",
  "GF",
  "GG",
  "GH",
  "GI",
  "GL",
  "GM",
  "GN",
  "GP",
  "GQ",
  "GR",
  "GS",
  "GT",
  "GU",
  "GW",
  "GY",
  "HK",
  "HM",
  "HN",
  "HR",
  "HT",
  "HU",
  "ID",
  "IE",
  "IL",
  "IM",
  "IN",
  "IO",
  "IQ",
  "IR",
  "IS",
  "IT",
  "JE",
  "JM",
  "JO",
  "JP",
  "KE",
  "KG",
  "KH",
  "KI",
  "KM",
  "KN",
  "KP",
  "KR",
  "KW",
  "KY",
  "KZ",
  "LA",
  "LB",
  "LC",
  "LI",
  "LK",
  "LR",
  "LS",
  "LT",
  "LU",
  "LV",
  "LY",
  "MA",
  "MC",
  "MD",
  "ME",
  "MF",
  "MG",
  "MH",
  "MK",
  "ML",
  "MM",
  "MN",
  "MO",
  "MP",
  "MQ",
  "MR",
  "MS",
  "MT",
  "MU",
  "MV",
  "MW",
  "MX",
  "MY",
  "MZ",
  "NA",
  "NC",
  "NE",
  "NF",
  "NG",
  "NI",
  "NL",
  "NO",
  "NP",
  "NR",
  "NU",
  "NZ",
  "OM",
  "PA",
  "PE",
  "PF",
  "PG",
  "PH",
  "PK",
  "PL",
  "PM",
  "PN",
  "PR",
  "PS",
  "PT",
  "PW",
  "PY",
  "QA",
  "RE",
  "RO",
  "RS",
  "RU",
  "RW",
  "SA",
  "SB",
  "SC",
  "SD",
  "SE",
  "SG",
  "SH",
  "SI",
  "SJ",
  "SK",
  "SL",
  "SM",
  "SN",
  "SO",
  "SR",
  "SS",
  "ST",
  "SV",
  "SX",
  "SY",
  "SZ",
  "TC",
  "TD",
  "TF",
  "TG",
  "TH",
  "TJ",
  "TK",
  "TL",
  "TM",
  "TN",
  "TO",
  "TR",
  "TT",
  "TV",
  "TW",
  "TZ",
  "UA",
  "UG",
  "UM",
  "US",
  "UY",
  "UZ",
  "VA",
  "VC",
  "VE",
  "VG",
  "VI",
  "VN",
  "VU",
  "WF",
  "WS",
  "YE",
  "YT",
  "ZA",
  "ZM",
  "ZW",
]);

/**
 * CountryFlag component displays flag images from flagcdn.com
 * Includes loading states, error handling, and fallback placeholder
 */
export default function CountryFlag({
  countryCode,
  countryName,
  size = "small",
  className = "",
}: CountryFlagProps): React.JSX.Element {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Validate country code - use normalizeCountryCode to handle aliases like UK->GB
  const normalizedCode = normalizeCountryCode(countryCode);
  const isValidCode = normalizedCode && KNOWN_COUNTRY_CODES.has(normalizedCode);

  // Get size configuration
  const sizeConfig = FLAG_SIZES[size] || FLAG_SIZES.small;

  // Show placeholder if no valid country code or if image failed to load
  if (!isValidCode || hasError) {
    const placeholderText = countryCode?.toUpperCase()?.trim() || "??";

    return (
      <div
        className={`inline-flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-sm ${className}`}
        style={{
          width: sizeConfig.width,
          height: sizeConfig.height,
          minWidth: sizeConfig.width,
          minHeight: sizeConfig.height,
        }}
        title={countryName || `Country: ${placeholderText}`}
        role="img"
        aria-label={`${countryName || placeholderText} flag placeholder`}
      >
        {placeholderText}
      </div>
    );
  }

  // Generate flag URL
  const flagUrl = `https://flagcdn.com/${sizeConfig.urlSize}/${normalizedCode.toLowerCase()}.png`;

  return (
    <FlagErrorBoundary countryCode={normalizedCode} countryName={countryName}>
      <div className={`inline-flex items-center ${className}`}>
        {/* Loading skeleton */}
        {isLoading && (
          <div
            className="absolute bg-gray-200 dark:bg-gray-700 animate-pulse rounded-sm"
            style={{
              width: sizeConfig.width,
              height: sizeConfig.height,
            }}
          />
        )}

        <Image
          src={flagUrl}
          alt={`${countryName || normalizedCode} flag`}
          width={sizeConfig.width}
          height={sizeConfig.height}
          className={`rounded-sm transition-opacity duration-200 ${isLoading ? "opacity-0" : "opacity-100"}`}
          loading="lazy"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          style={{
            minWidth: sizeConfig.width,
            minHeight: sizeConfig.height,
          }}
        />
      </div>
    </FlagErrorBoundary>
  );
}
