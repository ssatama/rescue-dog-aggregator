/**
 * Dog-related helper functions and utilities
 */

/**
 * Format dog age from age_min_months or age_text
 * @param {Object} dog - Dog object with age_min_months or age_text
 * @returns {string} Formatted age string
 */
export const formatAge = (dog) => {
  if (dog?.age_min_months) {
    if (dog.age_min_months < 12) {
      return `${dog.age_min_months} month${dog.age_min_months === 1 ? '' : 's'}`;
    } else {
      const years = Math.floor(dog.age_min_months / 12);
      const months = dog.age_min_months % 12;
      if (months === 0) {
        return `${years} year${years === 1 ? '' : 's'}`;
      } else {
        return `${years} year${years === 1 ? '' : 's'}, ${months} month${months === 1 ? '' : 's'}`;
      }
    }
  }
  return dog?.age_text || 'Age unknown';
};

/**
 * Categorize dog age into life stages
 * @param {Object} dog - Dog object with age_min_months or age_text
 * @returns {string} Age category: 'Puppy', 'Young', 'Adult', 'Senior', or 'Unknown'
 */
export const getAgeCategory = (dog) => {
  // Prefer age_min_months when available (most accurate)
  if (dog?.age_min_months) {
    const months = dog.age_min_months;
    
    if (months < 12) {
      return 'Puppy';
    } else if (months < 36) { // Less than 3 years
      return 'Young';
    } else if (months < 96) { // Less than 8 years (matches backend standardization)
      return 'Adult';
    } else {
      return 'Senior';
    }
  }
  
  // Fall back to standardized age_text when age_min_months not available
  if (dog?.age_text) {
    const ageText = dog.age_text.toLowerCase();
    
    // Handle standardized age categories
    if (ageText === 'puppy') return 'Puppy';
    if (ageText === 'young') return 'Young';
    if (ageText === 'adult') return 'Adult';
    if (ageText === 'senior') return 'Senior';
  }
  
  return 'Unknown';
};

/**
 * Format dog breed, preferring standardized_breed over breed
 * @param {Object} dog - Dog object with breed information
 * @returns {string|null} Formatted breed or null if unknown
 */
export const formatBreed = (dog) => {
  const rawBreed = dog?.standardized_breed || dog?.breed;
  if (!rawBreed || rawBreed === 'Unknown' || rawBreed.toLowerCase() === 'unknown') {
    return null;
  }
  return rawBreed;
};

/**
 * Format dog gender with appropriate icon
 * @param {Object} dog - Dog object with sex field
 * @returns {Object} Object with text and icon for gender
 */
export const formatGender = (dog) => {
  const sex = dog?.sex?.toLowerCase();
  
  switch (sex) {
    case 'male':
    case 'm':
      return { text: 'Male', icon: '♂️' };
    case 'female':
    case 'f':
      return { text: 'Female', icon: '♀️' };
    default:
      return { text: 'Unknown', icon: '❓' };
  }
};

/**
 * Check if dog was added recently (within last 7 days)
 * @param {Object} dog - Dog object with created_at field
 * @returns {boolean} True if dog is recent
 */
export const isRecentDog = (dog) => {
  if (!dog?.created_at) return false;
  
  try {
    const createdDate = new Date(dog.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdDate > sevenDaysAgo;
  } catch {
    return false; // Invalid date
  }
};

/**
 * Get organization name from dog object
 * @param {Object} dog - Dog object with nested organization
 * @returns {string} Organization name or fallback
 */
export const getOrganizationName = (dog) => {
  return dog?.organization?.name || 'Unknown Organization';
};

/**
 * Get shipping countries from dog's organization
 * @param {Object} dog - Dog object with nested organization
 * @returns {Array} Array of country codes the organization ships to
 */
export const getShipsToCountries = (dog) => {
  return dog?.organization?.ships_to || [];
};

/**
 * Format size display for dog cards
 * @param {Object} dog - Dog object with size information
 * @returns {string|null} Formatted size or null if unknown
 */
export const formatSize = (dog) => {
  const size = dog?.standardized_size || dog?.size;
  if (!size || size === 'Unknown' || size.toLowerCase() === 'unknown') {
    return null;
  }
  return size;
};