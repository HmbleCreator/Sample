const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // if using TypeScript with a baseUrl set to the root directory then you need the below for alias' to work
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  // Handle ES modules in node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(jose|@auth0/nextjs-auth0|@trpc|@tanstack)/)',
  ],
  // Enable ESM support
  transform: {
    '^.+\\.(js|jsx|ts|tsx|mjs)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  // Add support for .mjs files
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'json', 'node'],
  // Set test timeout
  testTimeout: 10000,
  // Add global setup for environment variables and mocks
  setupFiles: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/pages/api/**',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
