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
    // "**/integration/categoryApi.integration.test.js",
    "**/integration/homepageApi.integration.test.js",
    "**/integration/categoryproductApi.integration.test.js",
    "**/integration/productdetailsApi.integration.test.js",
    "**/integration/searchApi.integration.test.js"
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
