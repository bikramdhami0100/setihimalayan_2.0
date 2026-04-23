// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Use our custom transformer
config.transformer.babelTransformerPath = require.resolve('./transformer.js');

// Optional: prevent Metro from ignoring .cjs files (if needed)
config.resolver.assetExts.push('cjs');

module.exports = config;