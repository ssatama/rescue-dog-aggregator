/**
 * Schema.org structured data generation utilities
 * Pure functions for generating SEO-optimized structured data markup
 */

// Base URL for canonical URLs - should be from environment variable
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rescuedogs.me';

/**
 * Generate Schema.org Pet markup for dog detail pages
 * @param {Object} dog - Dog data object from database
 * @returns {Object|null} Schema.org Pet markup or null if invalid
 */
export const generatePetSchema = (dog) => {
  if (!dog || !dog.name) {
    return null;
  }

  // Build description by combining all available description sources
  const descriptions = [
    dog.description,
    dog.properties?.description
  ].filter(Boolean);
  
  const description = descriptions.length > 0 ? descriptions.join(' ') : undefined;

  // Format gender with proper capitalization
  const formatGender = (sex) => {
    if (!sex) return undefined;
    const normalized = sex.toLowerCase();
    if (normalized === 'male' || normalized === 'm') return 'Male';
    if (normalized === 'female' || normalized === 'f') return 'Female';
    return undefined;
  };

  // Build location object if organization data available
  const buildLocation = () => {
    if (!dog.organization) return undefined;

    const location = {
      '@type': 'Place',
      'name': dog.organization.name
    };

    if (dog.organization.city || dog.organization.country) {
      location.address = {
        '@type': 'PostalAddress'
      };
      
      if (dog.organization.city) {
        location.address.addressLocality = dog.organization.city;
      }
      
      if (dog.organization.country) {
        location.address.addressCountry = dog.organization.country;
      }
    }

    return location;
  };

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Pet',
    'name': dog.name,
    'animal': 'Dog'
  };

  // Add optional fields only if they exist
  if (dog.standardized_breed || dog.breed) {
    schema.breed = dog.standardized_breed || dog.breed;
  }

  if (dog.sex) {
    const gender = formatGender(dog.sex);
    if (gender) {
      schema.gender = gender;
    }
  }

  if (dog.age_text) {
    schema.age = dog.age_text;
  }

  if (description) {
    schema.description = description;
  }

  if (dog.primary_image_url) {
    schema.image = dog.primary_image_url;
  }

  const location = buildLocation();
  if (location) {
    schema.location = location;
  }

  // Add adoption offer information
  schema.offers = {
    '@type': 'Offer',
    'availability': 'https://schema.org/InStock',
    'price': '0',
    'priceCurrency': 'USD',
    'description': 'Pet adoption - no purchase price, adoption fees may apply'
  };

  return schema;
};

/**
 * Generate Schema.org Organization markup for rescue organizations
 * @param {Object} organization - Organization data object from database
 * @returns {Object|null} Schema.org Organization markup or null if invalid
 */
export const generateOrganizationSchema = (organization) => {
  if (!organization || !organization.name) {
    return null;
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'AnimalShelter'],
    'name': organization.name,
    'knowsAbout': 'Dog rescue and adoption services'
  };

  // Add optional fields only if they exist
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

  // Build address if location data available
  if (organization.city || organization.country) {
    schema.address = {
      '@type': 'PostalAddress'
    };

    if (organization.city) {
      schema.address.addressLocality = organization.city;
    }

    if (organization.country) {
      schema.address.addressCountry = organization.country;
    }

    // Add service area
    const serviceAreaParts = [organization.city, organization.country].filter(Boolean);
    if (serviceAreaParts.length > 0) {
      schema.serviceArea = {
        '@type': 'Place',
        'name': serviceAreaParts.join(', ')
      };
    }
  }

  // Add additional property for available dogs count
  if (organization.total_dogs && organization.total_dogs > 0) {
    schema.additionalProperty = {
      '@type': 'PropertyValue',
      'name': 'Available Dogs',
      'value': organization.total_dogs
    };
  }

  return schema;
};

/**
 * Generate Schema.org BreadcrumbList markup for navigation
 * @param {Object} breadcrumbData - Object with items array containing name and url
 * @returns {Object|null} Schema.org BreadcrumbList markup or null if invalid
 */
export const generateBreadcrumbSchema = (breadcrumbData) => {
  if (!breadcrumbData || !breadcrumbData.items || !Array.isArray(breadcrumbData.items)) {
    return null;
  }

  const itemListElement = breadcrumbData.items.map((item, index) => {
    const listItem = {
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name
    };

    // Add item URL if provided (current page typically doesn't have URL)
    if (item.url) {
      listItem.item = `${BASE_URL}${item.url}`;
    }

    return listItem;
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': itemListElement
  };
};

/**
 * Validate schema data against basic requirements
 * @param {string} schemaType - Type of schema to validate ('Pet', 'Organization', 'JsonLD')
 * @param {Object} data - Schema data to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const validateSchemaData = (schemaType, data) => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  switch (schemaType) {
    case 'Pet':
      return !!(data.name && data.animal);
    
    case 'Organization':
      return !!(data.name && data['@type']);
    
    case 'JsonLD':
      return !!(data['@context'] && data['@type']);
    
    default:
      return false;
  }
};

/**
 * Generate JSON-LD script tag content for embedding in HTML head
 * @param {Object} schema - Schema.org markup object
 * @returns {string} JSON-LD script content
 */
export const generateJsonLdScript = (schema) => {
  if (!schema) {
    return '';
  }

  return JSON.stringify(schema, null, 2);
};

/**
 * Combine multiple schemas into a single JSON-LD script
 * @param {Array<Object>} schemas - Array of schema objects
 * @returns {string} Combined JSON-LD script content
 */
export const combineSchemas = (schemas) => {
  const validSchemas = schemas.filter(schema => schema && typeof schema === 'object');
  
  if (validSchemas.length === 0) {
    return '';
  }

  if (validSchemas.length === 1) {
    return generateJsonLdScript(validSchemas[0]);
  }

  // Multiple schemas need to be wrapped in an array
  return JSON.stringify(validSchemas, null, 2);
};