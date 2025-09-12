// API Response Validation Utilities

export const validateBreedStats = (data) => {
  if (!data) {
    console.warn('[API] Breed stats data is null/undefined');
    return getDefaultBreedStats();
  }

  // Ensure breed_groups is always an array
  if (data.breed_groups && !Array.isArray(data.breed_groups)) {
    console.warn('[API] breed_groups is not an array:', typeof data.breed_groups);
    data.breed_groups = [];
  }

  // Ensure qualifying_breeds is always an array
  if (data.qualifying_breeds && !Array.isArray(data.qualifying_breeds)) {
    console.warn('[API] qualifying_breeds is not an array:', typeof data.qualifying_breeds);
    data.qualifying_breeds = [];
  }

  // Validate numeric fields
  data.total_dogs = Number(data.total_dogs) || 0;
  data.unique_breeds = Number(data.unique_breeds) || 0;
  data.purebred_count = Number(data.purebred_count) || 0;
  data.crossbreed_count = Number(data.crossbreed_count) || 0;

  return data;
};

export const getDefaultBreedStats = () => ({
  total_dogs: 0,
  unique_breeds: 0,
  breed_groups: [],
  qualifying_breeds: [],
  purebred_count: 0,
  crossbreed_count: 0,
  error: true
});

export const validateBreedGroups = (groups) => {
  if (!Array.isArray(groups)) {
    console.warn('[API] Breed groups is not an array:', typeof groups);
    return [];
  }

  return groups.filter(group => {
    if (!group || typeof group !== 'object') {
      console.warn('[API] Invalid breed group:', group);
      return false;
    }
    if (!group.name || typeof group.name !== 'string') {
      console.warn('[API] Breed group missing name:', group);
      return false;
    }
    return true;
  });
};

export const validateApiResponse = (response, expectedType = 'object') => {
  if (!response) {
    console.warn('[API] Response is null/undefined');
    return false;
  }

  if (expectedType === 'array' && !Array.isArray(response)) {
    console.warn('[API] Expected array but got:', typeof response);
    return false;
  }

  if (expectedType === 'object' && (typeof response !== 'object' || Array.isArray(response))) {
    console.warn('[API] Expected object but got:', typeof response);
    return false;
  }

  return true;
};