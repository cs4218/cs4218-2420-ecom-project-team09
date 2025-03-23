export default {
  // display name
  displayName: "backend",
  forceExit: true,

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: [
    // "<rootDir>/controllers/**/*.test.js",
    // "<rootDir>/helpers/*.test.js",
    // "<rootDir>/middlewares/*.test.js",
    // "**/integration/*.test.js",
    "**/integration/categoryApi.integration.test.js",
    // "**/integration/productApi.integration.test.js"
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "controllers/**",
    "helpers/**",
    "middlewares/**",
  ],
  coverageThreshold: {
    global: {
      lines: 0,
      functions: 0,
    },
  },
};
