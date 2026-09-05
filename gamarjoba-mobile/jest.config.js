/** Jest — pure-logic tests for the content bridge, exercise engine and store. */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))',
  ],
};
