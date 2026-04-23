
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          unstable_transformImportMeta: true,   // ✅ this is key
        },
      ],
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};