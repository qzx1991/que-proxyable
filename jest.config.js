module.exports = {
  testEnvironment: 'node',
  coverageDirectory: './_coverage/',
  coveragePathIgnorePatterns: [
      '<rootDir>/node_modules/', '<rootDir>/lib/builder/webpack/plugins/vue', '<rootDir>/lib/[^/]*\\.js'
  ],
  // setupTestFrameworkScriptFile: './test/utils/setup',
  testPathIgnorePatterns: ['test/fixtures/.*/.*?/'],
  expand: true,
  "transform": {
      "^.+\\.tsx?$": "ts-jest"
  },
  "testRegex": "(/src/.*(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  "moduleFileExtensions": [
      "ts",
      "tsx",
      "js",
      "jsx",
      "json",
      "node"
  ]
}