/* Jest setup — official AsyncStorage mock (in-memory, promise-based). */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
