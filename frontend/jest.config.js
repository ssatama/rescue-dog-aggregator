const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // Handle CSS imports (if you're using CSS Modules)
    // '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Keep if needed, otherwise remove if not using CSS modules

    // Handle module aliases (if you have them in tsconfig.json or jsconfig.json)
    // Example: '^@/components/(.*)$': '<rootDir>/src/components/$1',

    // Keep your existing mock for static assets
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.js'
  },
  // If you're using TypeScript with a baseUrl set to the root directory then you need the below for alias' to work
  moduleDirectories: ['node_modules', '<rootDir>/'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)