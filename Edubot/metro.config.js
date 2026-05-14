// metro.config.js
// Extends the default Expo Metro configuration.
// Adds .wasm to asset extensions so expo-sqlite's web worker
// (wa-sqlite) can be resolved without a "Unable to resolve" error.

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to treat .wasm files as static assets
config.resolver.assetExts.push('wasm');

module.exports = config;
