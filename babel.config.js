module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  plugins.push([
    "@babel/plugin-transform-modules-commonjs",
    {
      allowTopLevelThis: true,
    },
  ]);
  plugins.push("react-native-worklets/plugin");

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins,
  };
};
