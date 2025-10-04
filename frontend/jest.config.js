const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/src/$1',

    // Handle static assets
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.js',

    // Mock MDX packages
    '^next-mdx-remote/serialize$': '<rootDir>/src/__mocks__/next-mdx-remote/serialize.ts',
    '^remark-gfm$': '<rootDir>/src/__mocks__/remark-gfm.ts',
    '^rehype-slug$': '<rootDir>/src/__mocks__/rehype-slug.ts',
    '^rehype-autolink-headings$': '<rootDir>/src/__mocks__/rehype-autolink-headings.ts',
    '^rehype-highlight$': '<rootDir>/src/__mocks__/rehype-highlight.ts'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@vercel/analytics|@vercel/speed-insights|react-error-boundary|next-mdx-remote|remark-gfm|rehype-slug|rehype-autolink-headings|rehype-highlight)/)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e-tests/',
    '/__tests__/e2e/',
    '.*\\.e2e\\.test\\.(js|jsx|ts|tsx)$'
  ]
}

module.exports = createJestConfig(customJestConfig)