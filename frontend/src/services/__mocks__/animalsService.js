// Manual mock for animalsService
module.exports = {
  getAnimals: jest.fn(),
  getAnimalById: jest.fn(),
  getAnimalsByCuration: jest.fn(),
  getStandardizedBreeds: jest.fn(),
  getBreedGroups: jest.fn(),
  getLocationCountries: jest.fn(),
  getAvailableCountries: jest.fn(),
  getAvailableRegions: jest.fn(),
  getOrganizations: jest.fn(),
  getStatistics: jest.fn(),
};