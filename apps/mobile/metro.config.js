// Expo SDK 52+ detecta monorepos automáticamente (watchFolders y nodeModulesPaths).
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
