import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  // Any cached log this suite writes goes to a directory that goes away
  // with it, rather than into the cache of whoever ran the tests.
  globalSetup: "<rootDir>/test/cache-redirect-setup.ts",
  globalTeardown: "<rootDir>/test/cache-redirect-teardown.ts",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          rootDir: ".",
        },
      },
    ],
  },
};

export default config;
