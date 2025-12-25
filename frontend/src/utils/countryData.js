// Country configuration for Country Hub Pages
// Maps country codes to metadata for SEO and display

export const COUNTRIES = {
  UK: {
    code: "UK",
    name: "United Kingdom",
    shortName: "UK",
    flag: "\u{1F1EC}\u{1F1E7}",
    gradient: "from-rose-500 via-orange-500 to-amber-400",
    accentColor: "#dc2626",
    tagline: "From the British Isles with love",
    description:
      "Rescue dogs from UK-based organizations including Dogs Trust and Many Tears",
  },
  DE: {
    code: "DE",
    name: "Germany",
    shortName: "Germany",
    flag: "\u{1F1E9}\u{1F1EA}",
    gradient: "from-amber-500 via-orange-500 to-red-500",
    accentColor: "#fbbf24",
    tagline: "German precision, unconditional love",
    description:
      "Dogs rescued by Tierschutzverein Europa and other German organizations",
  },
  SR: {
    code: "SR",
    name: "Serbia",
    shortName: "Serbia",
    flag: "\u{1F1F7}\u{1F1F8}",
    gradient: "from-red-500 via-orange-500 to-blue-500",
    accentColor: "#3b82f6",
    tagline: "Brave hearts from the Balkans",
    description: "Street dogs and shelter rescues seeking homes abroad",
  },
  BA: {
    code: "BA",
    name: "Bosnia & Herzegovina",
    shortName: "Bosnia",
    flag: "\u{1F1E7}\u{1F1E6}",
    gradient: "from-blue-500 via-orange-400 to-amber-400",
    accentColor: "#2563eb",
    tagline: "Mountain resilience, gentle souls",
    description: "Dogs rescued from Bosnian streets and shelters",
  },
  BG: {
    code: "BG",
    name: "Bulgaria",
    shortName: "Bulgaria",
    flag: "\u{1F1E7}\u{1F1EC}",
    gradient: "from-green-500 via-orange-500 to-red-400",
    accentColor: "#16a34a",
    tagline: "From the heart of the Balkans",
    description: "Rescued by Santer Paws and Bulgarian organizations",
  },
  IT: {
    code: "IT",
    name: "Italy",
    shortName: "Italy",
    flag: "\u{1F1EE}\u{1F1F9}",
    gradient: "from-green-500 via-orange-400 to-red-500",
    accentColor: "#16a34a",
    tagline: "Amore at first sight",
    description: "Italian rescue dogs seeking loving homes",
  },
  TR: {
    code: "TR",
    name: "Turkey",
    shortName: "Turkey",
    flag: "\u{1F1F9}\u{1F1F7}",
    gradient: "from-red-500 via-orange-500 to-red-400",
    accentColor: "#dc2626",
    tagline: "Street survivors, forever friends",
    description: "Dogs from Turkish rescues and street dog programs",
  },
  CY: {
    code: "CY",
    name: "Cyprus",
    shortName: "Cyprus",
    flag: "\u{1F1E8}\u{1F1FE}",
    gradient: "from-amber-400 via-orange-500 to-teal-500",
    accentColor: "#14b8a6",
    tagline: "Mediterranean sunshine, warm hearts",
    description: "Island rescues seeking new beginnings",
  },
};

export const getCountryByCode = (code) =>
  COUNTRIES[code?.toUpperCase()] || null;

export const getAllCountryCodes = () => Object.keys(COUNTRIES);

export const getCountriesArray = () => Object.values(COUNTRIES);
