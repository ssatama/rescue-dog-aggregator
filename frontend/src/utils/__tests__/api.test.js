// Add to src/utils/__tests__/api.test.js:
import { get } from '../api';

// Mock global fetch
global.fetch = jest.fn();

describe('API Utilities', () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
  });
  
  test('get function makes request with correct URL', async () => {
    // Setup mock successful response
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ data: 'test data' })
    };
    global.fetch.mockResolvedValue(mockResponse);
    
    // Call the function
    await get('/test-endpoint');
    
    // Assert fetch was called correctly
    expect(global.fetch).toHaveBeenCalled();
    expect(global.fetch.mock.calls[0][0]).toContain('/test-endpoint');
  });
});