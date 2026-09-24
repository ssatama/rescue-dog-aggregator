import type { Dog } from "@/types/dog";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me";

/**
 * The site's one Organization and WebSite entities (#443). Output once in the root layout;
 * everything else (publisher, author, worksFor, isPartOf) references them by @id, so search
 * engines and LLMs see a single, consistently named entity.
 */
export const SITE_NAME = "Rescue Dog Aggregator";
export const SITE_ORGANIZATION_ID = `${BASE_URL}/#organization`;
export const WEBSITE_ID = `${BASE_URL}/#website`;

export const siteOrganizationRef = { "@id": SITE_ORGANIZATION_ID } as const;

export const generateSiteGraph = (): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": SITE_ORGANIZATION_ID,
      name: SITE_NAME,
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo.jpeg`,
        width: 512,
        height: 512,
      },
      sameAs: [
        "https://github.com/ssatama/rescue-dog-aggregator",
        "https://github.com/ssatama/rescuedogs-mcp-server",
        "https://www.npmjs.com/package/rescuedogs-mcp-server",
      ],
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      name: SITE_NAME,
      url: BASE_URL,
      description:
        "Find adoptable rescue dogs from verified organizations across Europe. Browse dogs available for adoption from shelters and rescues.",
      publisher: siteOrganizationRef,
      inLanguage: "en-US",
    },
  ],
});

export const getAvailability = (status: string | undefined): string => {
  switch (status) {
    case "available":
      return "https://schema.org/InStock";
    case "adopted":
      return "https://schema.org/OutOfStock";
    case "reserved":
      return "https://schema.org/LimitedAvailability";
    case "unknown":
    default:
      return "https://schema.org/InStock";
  }
};

interface DogForSchema extends Omit<Partial<Dog>, "organization"> {
  organization?: {
    id?: number | string;
    name?: string;
    city?: string;
    country?: string;
    config_id?: string;
    slug?: string;
    website_url?: string;
    adoption_fees?: {
      usual_fee?: number | null;
      currency?: string;
    };
  };
}

export const generatePetSchema = (dog: DogForSchema | null | undefined): Record<string, unknown> | null => {
  if (!dog || !dog.name) {
    return null;
  }

  let description: string | undefined;
  if (dog.llm_description) {
    description = dog.llm_description;
  } else {
    const descriptions = [dog.description, dog.properties?.description].filter(
      Boolean,
    );
    description = descriptions.length > 0 ? descriptions.join(" ") : undefined;
  }

  const formatGender = (sex: string | undefined): string | undefined => {
    if (!sex) return undefined;
    const normalized = sex.toLowerCase();
    if (normalized === "male" || normalized === "m") return "Male";
    if (normalized === "female" || normalized === "f") return "Female";
    return undefined;
  };

  const buildLocation = (): Record<string, unknown> | undefined => {
    if (!dog.organization) return undefined;

    const location: Record<string, unknown> = {
      "@type": "Place",
      name: dog.organization.name,
    };

    if (dog.organization.city || dog.organization.country) {
      const address: Record<string, string> = {
        "@type": "PostalAddress",
      };

      if (dog.organization.city) {
        address.addressLocality = dog.organization.city;
      }

      if (dog.organization.country) {
        address.addressCountry = dog.organization.country;
      }

      location.address = address;
    }

    return location;
  };

  const buildLocationString = (): string | undefined => {
    if (!dog.organization) return undefined;

    const locationParts = [
      dog.organization.city,
      dog.organization.country,
    ].filter(Boolean);

    return locationParts.length > 0 ? locationParts.join(", ") : undefined;
  };

  const buildName = (): string => {
    if (dog.llm_tagline) {
      return `${dog.name}: ${dog.llm_tagline}`;
    }
    const breed = dog.standardized_breed || dog.breed;
    return breed ? `${dog.name} - ${breed}` : dog.name!;
  };

  // A dog is not a Product: Google requires offers/review/aggregateRating on Products, and
  // adoption fees vary and aren't ours to state. The page is an ItemPage about the dog (#443).
  const dogEntity: Record<string, unknown> = {
    "@type": "Thing",
    additionalType: "http://dbpedia.org/ontology/Dog",
    name: dog.name,
  };

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ItemPage",
    name: buildName(),
    about: dogEntity,
    isPartOf: { "@id": WEBSITE_ID },
  };

  if (dog.slug) {
    schema.url = `${BASE_URL}/dogs/${dog.slug}`;
  }

  if (description) {
    schema.description = description;
    dogEntity.description = description;
  }

  if (dog.primary_image_url) {
    schema.image = dog.primary_image_url;
    dogEntity.image = dog.primary_image_url;
  }

  if (dog.organization) {
    schema.isBasedOn = {
      "@type": "WebPage",
      url: dog.organization.website_url,
      name: dog.organization.name,
    };
  }

  const additionalProperty: Record<string, unknown>[] = [];

  if (dog.age_text) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "Age",
      value: dog.age_text,
    });
  }

  if (dog.standardized_breed || dog.breed) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "Breed",
      value: dog.standardized_breed || dog.breed,
    });
  }

  if (dog.sex) {
    const gender = formatGender(dog.sex);
    if (gender) {
      additionalProperty.push({
        "@type": "PropertyValue",
        name: "Gender",
        value: gender,
      });
    }
  }

  const locationString = buildLocationString();
  if (locationString) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "Location",
      value: locationString,
    });
  }

  if (additionalProperty.length > 0) {
    dogEntity.additionalProperty = additionalProperty;
  }

  return schema;
};

interface OrganizationData {
  name: string;
  description?: string;
  website_url?: string;
  logo_url?: string;
  established_year?: number;
  city?: string;
  country?: string;
  total_dogs?: number;
}

export const generateOrganizationSchema = (organization: OrganizationData | null | undefined): Record<string, unknown> | null => {
  if (!organization || !organization.name) {
    return null;
  }

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "AnimalShelter"],
    name: organization.name,
    knowsAbout: "Dog rescue and adoption services",
  };

  if (organization.description) {
    schema.description = organization.description;
  }

  if (organization.website_url) {
    schema.url = organization.website_url;
  }

  if (organization.logo_url) {
    schema.logo = organization.logo_url;
  }

  if (organization.established_year) {
    schema.foundingDate = organization.established_year.toString();
  }

  if (organization.city || organization.country) {
    const address: Record<string, string> = {
      "@type": "PostalAddress",
    };

    if (organization.city) {
      address.addressLocality = organization.city;
    }

    if (organization.country) {
      address.addressCountry = organization.country;
    }

    schema.address = address;

    const serviceAreaParts = [organization.city, organization.country].filter(
      Boolean,
    );
    if (serviceAreaParts.length > 0) {
      schema.serviceArea = {
        "@type": "Place",
        name: serviceAreaParts.join(", "),
      };
    }
  }

  if (organization.total_dogs && organization.total_dogs > 0) {
    schema.additionalProperty = {
      "@type": "PropertyValue",
      name: "Available Dogs",
      value: organization.total_dogs,
    };
  }

  return schema;
};

interface BreadcrumbItem {
  name: string;
  url?: string;
}

interface BreadcrumbData {
  items: BreadcrumbItem[];
}

export const generateBreadcrumbSchema = (breadcrumbData: BreadcrumbData | null | undefined): Record<string, unknown> | null => {
  if (
    !breadcrumbData ||
    !breadcrumbData.items ||
    !Array.isArray(breadcrumbData.items)
  ) {
    return null;
  }

  const itemListElement = breadcrumbData.items.map((item, index) => {
    const listItem: Record<string, unknown> = {
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
    };

    if (item.url) {
      listItem.item = `${BASE_URL}${item.url}`;
    }

    return listItem;
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: itemListElement,
  };
};

export const validateSchemaData = (schemaType: string, data: Record<string, unknown> | null | undefined): boolean => {
  if (!data || typeof data !== "object") {
    return false;
  }

  switch (schemaType) {
    case "Pet":
      return !!(
        data.name &&
        data["@type"] === "ItemPage" &&
        (data.about as Record<string, unknown> | undefined)?.additionalType
      );

    case "Organization":
      return !!(data.name && data["@type"]);

    case "JsonLD":
      return !!(data["@context"] && data["@type"]);

    default:
      return false;
  }
};

export const generateJsonLdScript = (schema: Record<string, unknown> | null | undefined): string => {
  if (!schema) {
    return "";
  }

  return JSON.stringify(schema, null, 2);
};

export const combineSchemas = (schemas: (Record<string, unknown> | null | undefined)[]): string => {
  const validSchemas = schemas.filter(
    (schema): schema is Record<string, unknown> => schema != null && typeof schema === "object",
  );

  if (validSchemas.length === 0) {
    return "";
  }

  if (validSchemas.length === 1) {
    return generateJsonLdScript(validSchemas[0]);
  }

  return JSON.stringify(validSchemas, null, 2);
};
