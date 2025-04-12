// Add to src/services/__tests__/dogsService.test.js:
import { getDogs, getDogById } from '../dogsService';
import { get } from '../../utils/api';

// Mock the api utility
jest.mock('../../utils/api', () => ({
  get: jest.fn()
}));

describe('dogsService', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
  });
  
  test('getDogs calls API with correct parameters', async () => {
    // Setup mock return value
    get.mockResolvedValue([{ id: 1, name: 'Test Dog' }]);
    
    // Call the service method with standardized fields
    await getDogs({ 
      page: 1, 
      standardized_breed: 'Labrador Retriever',
      standardized_size: 'Large',
      status: 'available'
    });
    
    // Check that get was called with correct parameters
    expect(get).toHaveBeenCalledWith('/api/dogs', {
      page: 1,
      standardized_breed: 'Labrador Retriever',
      standardized_size: 'Large',
      status: 'available'
    });
  });
  
  test('getDogById calls API with correct ID', async () => {
    // Setup mock
    get.mockResolvedValue({ id: 1, name: 'Test Dog' });
    
    // Call the service method
    await getDogById(1);
    
    // Check API was called correctly
    expect(get).toHaveBeenCalledWith('/api/dogs/1');
  });
});