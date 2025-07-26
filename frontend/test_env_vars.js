// Simple test to check what NEXT_PUBLIC_API_URL is being used in production

console.log('Environment Variables Test:');
console.log('NEXT_PUBLIC_API_URL from process.env:', process.env.NEXT_PUBLIC_API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Test what the API utility would use
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
console.log('API_BASE_URL that would be used:', API_BASE_URL);

// Test the actual fetch that would happen
const testEndpoint = '/api/animals?limit=5';
const fullUrl = `${API_BASE_URL}${testEndpoint}`;
console.log('Full URL that would be constructed:', fullUrl);

// Test if we can reach the API
fetch(fullUrl)
  .then(response => {
    console.log('API response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('API returned', data.length, 'animals');
    console.log('First animal slug:', data[0]?.slug);
  })
  .catch(error => {
    console.error('API fetch failed:', error.message);
  });