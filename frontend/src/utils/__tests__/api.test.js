import { get } from '../api';

// Console error suppression is handled globally in jest.setup.js

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

describe('get()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls fetch with correct URL and query string', async () => {
    const fakeJson = { foo: 'bar' };
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(fakeJson) });
    const result = await get('/dogs', { limit: 5, search: 'rex' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/dogs?limit=5&search=rex'),
      { headers: { 'Content-Type': 'application/json' } }
    );
    expect(result).toEqual(fakeJson);
  });

  it('throws on non‑ok response', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Oops',
      json: jest.fn().mockResolvedValue({}) // stub json() so .catch() branch runs
    });
    await expect(get('/dogs')).rejects.toThrow('API error: 500 Oops');
  });
});