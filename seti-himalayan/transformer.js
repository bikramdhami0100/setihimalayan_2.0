// transformer.js
const upstreamTransformer = require('@expo/metro-config/babel-transformer');

module.exports.transform = function (props) {
  // Force Babel to transform zustand/middleware (which contains import.meta)
  if (props.filename.includes('node_modules/zustand')) {
    props.options = {
      ...props.options,
      babelrc: false,
      configFile: false,
      plugins: ['@babel/plugin-syntax-import-meta'],
    };
  }
  return upstreamTransformer.transform(props);
};