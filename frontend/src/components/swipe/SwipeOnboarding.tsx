import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SwipeFilters } from "../../hooks/useSwipeFilters";

interface SwipeOnboardingProps {
  onComplete: (skipped: boolean, filters?: SwipeFilters) => void;
}

const COUNTRIES = [
  {
    value: "Germany",
    label: "Germany",
    flag: "🇩🇪",
    count: "486 dogs available",
  },
  {
    value: "United Kingdom",
    label: "United Kingdom",
    flag: "🇬🇧",
    count: "1,245 dogs available",
  },
  {
    value: "United States",
    label: "United States",
    flag: "🇺🇸",
    count: "342 dogs available",
  },
];

const SIZES = [
  { value: "small", label: "Small", icon: "🐕" },
  { value: "medium", label: "Medium", icon: "🐕‍🦺" },
  { value: "large", label: "Large", icon: "🦮" },
  { value: "giant", label: "Giant", icon: "🐻" },
];

export default function SwipeOnboarding({ onComplete }: SwipeOnboardingProps) {
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const onboardingComplete =
      localStorage.getItem("swipeOnboardingComplete") === "true";
    const savedFilters = localStorage.getItem("swipeFilters");

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
    };

    localStorage.setItem("swipeOnboardingComplete", "true");
    localStorage.setItem("swipeFilters", JSON.stringify(filters));

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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-label="Swipe feature onboarding"
    >
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
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
                <h2 className="text-2xl font-bold mb-2">
                  Where can you adopt?
                </h2>
                <p className="text-gray-600">
                  We&apos;ll show dogs available in your country
                </p>
              </div>

              <div className="space-y-3">
                {COUNTRIES.map((country) => (
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
                          ? "border-orange-500 bg-orange-50 selected"
                          : "border-gray-200 hover:border-orange-300"
                      }
                    `}
                    aria-label={country.label}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl mr-3">{country.flag}</span>
                        <span className="font-medium">{country.label}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {country.count}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleContinue}
                disabled={!selectedCountry}
                className={`
                  w-full mt-6 py-3 rounded-lg font-medium transition-all
                  ${
                    selectedCountry
                      ? "bg-orange-500 text-white hover:bg-orange-600"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
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
                <span className="text-sm text-gray-500">Step 1 of 2</span>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 animate-in"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">
                  Size preference? (optional)
                </h2>
                <p className="text-gray-600">Select your preferred dog sizes</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {SIZES.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => toggleSize(size.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        toggleSize(size.value);
                      }
                    }}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${
                        selectedSizes.includes(size.value)
                          ? "border-orange-500 bg-orange-50 selected"
                          : "border-gray-200 hover:border-orange-300"
                      }
                    `}
                    aria-label={size.label}
                  >
                    <div className="text-2xl mb-1">{size.icon}</div>
                    <div className="font-medium">{size.label}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleComplete}
                className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-all"
                aria-label="Start Swiping"
              >
                Start Swiping
              </button>

              <button
                onClick={handleSkipSizes}
                className="w-full mt-3 py-3 text-gray-600 hover:text-gray-800 transition-all"
                aria-label="All sizes"
              >
                Skip - All sizes
              </button>

              <div
                className="mt-4 text-center"
                role="status"
                aria-live="polite"
              >
                <span className="text-sm text-gray-500">Step 2 of 2</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
