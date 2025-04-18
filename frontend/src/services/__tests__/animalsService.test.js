import { getAnimals, getAnimalById } from '../animalsService';
import { get } from '../../utils/api';

// Mock the api utility
jest.mock('../../utils/api', () => ({
  get: jest.fn()
}));

describe('animalsService', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
  });
  
  test('getAnimals calls API with correct parameters', async () => {
    // Setup mock return value
    get.mockResolvedValue([{ id: 1, name: 'Test Animal' }]);
    
    const filters = {
      limit: 10,
      offset: 0,
      standardized_breed: 'Labrador Retriever',
      standardized_size: 'Large',
      status: 'available',
      sex: 'Male',
      age_category: 'Adult',
      search: 'buddy'
      // Add other potential filters if needed
    };

    // Call the service method with standardized fields
    await getAnimals(filters);
    
    // Check that get was called with correct parameters
    expect(get).toHaveBeenCalledWith(
      '/api/animals',
      expect.objectContaining({
        ...filters,
        animal_type: 'dog',
        status: 'available',
      })
    );
  });
  
  test('getAnimalById calls API with correct ID', async () => {
    // Setup mock
    get.mockResolvedValue({ id: 1, name: 'Test Animal' });
    
    // Call the service method
    await getAnimalById(1);
    
    // Check API was called correctly
    expect(get).toHaveBeenCalledWith('/api/animals/1');
  });
});