import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SwipeFilters } from "../../hooks/useSwipeFilters";
import { safeStorage } from "../../utils/safeStorage";

interface SwipeOnboardingProps {
  onComplete: (skipped: boolean, filters?: SwipeFilters) => void;
}

interface CountryOption {
  value: string;
  label: string;
  flag: string;
  count: number;
}

interface SizeOption {
  value: string;
  label: string;
  icon: string;
  count?: number;
}

// Country flags mapping
const COUNTRY_FLAGS: Record<string, string> = {
  UK: "🇬🇧",
  GB: "🇬🇧",
  US: "🇺🇸",
  DE: "🇩🇪",
  FR: "🇫🇷",
  ES: "🇪🇸",
  IT: "🇮🇹",
  NL: "🇳🇱",
  BE: "🇧🇪",
  AT: "🇦🇹",
  CH: "🇨🇭",
  SE: "🇸🇪",
  NO: "🇳🇴",
  DK: "🇩🇰",
  FI: "🇫🇮",
  PL: "🇵🇱",
  CZ: "🇨🇿",
  HU: "🇭🇺",
  RO: "🇷🇴",
  BG: "🇧🇬",
  GR: "🇬🇷",
  PT: "🇵🇹",
  IE: "🇮🇪",
  LU: "🇱🇺",
  MT: "🇲🇹",
  CY: "🇨🇾",
  EE: "🇪🇪",
  LV: "🇱🇻",
  LT: "🇱🇹",
  SK: "🇸🇰",
  SI: "🇸🇮",
  HR: "🇭🇷",
  BA: "🇧🇦",
  RS: "🇷🇸",
  ME: "🇲🇪",
  MK: "🇲🇰",
  AL: "🇦🇱",
  TR: "🇹🇷",
  SR: "🇸🇷",
};

const SIZES: SizeOption[] = [
  { value: "small", label: "Small", icon: "🐕" },
  { value: "medium", label: "Medium", icon: "🐕‍🦺" },
  { value: "large", label: "Large", icon: "🦮" },
  { value: "giant", label: "Giant", icon: "🐻" },
];

const AGES: SizeOption[] = [
  { value: "puppy", label: "Puppy", icon: "🐶" },
  { value: "young", label: "Young", icon: "🐕" },
  { value: "adult", label: "Adult", icon: "🦮" },
  { value: "senior", label: "Senior", icon: "🐕‍🦺" },
];

export default function SwipeOnboarding({ onComplete }: SwipeOnboardingProps) {
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedAges, setSelectedAges] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [sizesWithCounts, setSizesWithCounts] = useState<SizeOption[]>(SIZES);
  const [loading, setLoading] = useState(true);
  const [showAllCountries, setShowAllCountries] = useState(false);

  // Fetch available countries dynamically
  useEffect(() => {
    const fetchAvailableCountries = async () => {
      try {
        const response = await fetch("/api/dogs/available-countries");
        const data = await response.json();

        // Transform API response to CountryOption format
        const countriesWithCounts = (data.countries || data).map(
          (country: any) => ({
            value: country.code,
            label: country.name,
            flag: COUNTRY_FLAGS[country.code] || "🏳️",
            count: country.dog_count || country.dogCount,
          }),
        );

        setCountries(countriesWithCounts);
      } catch (error) {
        console.error("Failed to fetch available countries:", error);
        // Fallback to empty list
        setCountries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableCountries();
  }, []);

  // Fetch size counts when country is selected
  useEffect(() => {
    if (!selectedCountry) return;

    const fetchSizeCounts = async () => {
      try {
        const sizePromises = SIZES.map(async (size) => {
          const response = await fetch(
            `/api/dogs/swipe?adoptable_to_country=${selectedCountry}&size[]=${size.value}&limit=1`,
          );
          const data = await response.json();
          return {
            ...size,
            count: data.total || 0,
          };
        });

        const sizesWithCounts = await Promise.all(sizePromises);
        setSizesWithCounts(sizesWithCounts);
      } catch (error) {
        console.error("Failed to fetch size counts:", error);
        setSizesWithCounts(SIZES);
      }
    };

    fetchSizeCounts();
  }, [selectedCountry]);

  useEffect(() => {
    const onboardingComplete =
      safeStorage.get("swipeOnboardingComplete") === "true";
    const savedFilters = safeStorage.get("swipeFilters");

    if (onboardingComplete && savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        if (filters.country) {
          onComplete(true);
          return;
        }
      } catch (error) {
        console.error("Failed to parse saved filters:", error);
      }
    }

    setShowOnboarding(true);
  }, [onComplete]);

  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  };

  const handleContinue = () => {
    if (step === 1 && selectedCountry) {
      setStep(2);
    }
  };

  const handleComplete = () => {
    const filters: SwipeFilters = {
      country: selectedCountry,
      sizes: selectedSizes,
      ages: selectedAges,
    };

    safeStorage.set("swipeOnboardingComplete", "true");
    safeStorage.stringify("swipeFilters", filters);

    onComplete(false, filters);
  };

  const handleSkipSizes = () => {
    handleComplete();
  };

  if (!showOnboarding) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-label="Swipe feature onboarding"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 animate-in"
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🌍</div>
                <h2 className="text-2xl font-bold mb-2 dark:text-gray-100">
                  Where can you adopt?
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  We&apos;ll show dogs available in your country
                </p>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="text-gray-500 dark:text-gray-400">
                      Loading available dogs...
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Show top 5 countries or selected + top 4 */}
                    {(() => {
                      const topCountries = countries.slice(0, 5);
                      const displayCountries = showAllCountries
                        ? countries
                        : topCountries;

                      return displayCountries.map((country) => (
                        <button
                          key={country.value}
                          onClick={() => handleCountrySelect(country.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleCountrySelect(country.value);
                            }
                          }}
                          className={`
                            w-full p-4 rounded-lg border-2 transition-all text-left
                            ${
                              selectedCountry === country.value
                                ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 selected"
                                : "border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500"
                            }
                          `}
                          aria-label={country.label}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-2xl mr-3">
                                {country.flag}
                              </span>
                              <span className="font-medium dark:text-gray-100">
                                {country.label}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {country.count}{" "}
                              {country.count === 1 ? "dog" : "dogs"} available
                            </div>
                          </div>
                        </button>
                      ));
                    })()}

                    {/* Show more/less button if there are more than 5 countries */}
                    {countries.length > 5 && (
                      <button
                        onClick={() => setShowAllCountries(!showAllCountries)}
                        className="w-full py-2 text-center text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 transition-colors text-sm font-medium"
                        aria-label={
                          showAllCountries
                            ? "Show fewer countries"
                            : "Show all countries"
                        }
                      >
                        {showAllCountries ? (
                          <span className="flex items-center justify-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                            Show fewer countries
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                            Show {countries.length - 5} more countries
                          </span>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>

              <button
                onClick={handleContinue}
                disabled={!selectedCountry}
                className={`
                  w-full mt-6 py-3 rounded-lg font-medium transition-all
                  ${
                    selectedCountry
                      ? "bg-orange-500 text-white hover:bg-orange-600"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  }
                `}
                aria-label="Continue"
              >
                Continue
              </button>

              <div
                className="mt-4 text-center"
                role="status"
                aria-live="polite"
              >
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Step 1 of 2
                </span>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 animate-in relative"
            >
              {/* Back button */}
              <button
                onClick={() => setStep(1)}
                className="absolute top-4 left-4 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                aria-label="Go back"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div className="text-center mb-6 mt-8">
                <h2 className="text-2xl font-bold mb-2 dark:text-gray-100">
                  Size preference? (optional)
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Select your preferred dog sizes
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {sizesWithCounts.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => toggleSize(size.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        toggleSize(size.value);
                      }
                    }}
                    className={`
                      p-4 rounded-lg border-2 transition-all relative
                      ${
                        selectedSizes.includes(size.value)
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 selected"
                          : "border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500"
                      }
                    `}
                    aria-label={size.label}
                  >
                    <div className="text-2xl mb-1">{size.icon}</div>
                    <div className="font-medium dark:text-gray-100">
                      {size.label}
                    </div>
                    {size.count !== undefined && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {size.count} {size.count === 1 ? "dog" : "dogs"}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={handleComplete}
                className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-all"
                aria-label="Start Browsing"
              >
                Start Browsing
              </button>

              <button
                onClick={handleSkipSizes}
                className="w-full mt-3 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all"
                aria-label="All sizes"
              >
                Skip - All sizes
              </button>

              <div
                className="mt-4 text-center"
                role="status"
                aria-live="polite"
              >
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Step 2 of 2
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
