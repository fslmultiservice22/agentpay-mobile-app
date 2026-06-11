module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  plugins.push("react-native-worklets/plugin");
  plugins.push([
    "@babel/plugin-transform-modules-commonjs",
    {
      allowTopLevelThis: true,
    },
  ]);

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins,
    overrides: [
      {
        test: /node_modules\/zustand/,
        plugins: [
          [
            "@babel/plugin-transform-modules-commonjs",
            { allowTopLevelThis: true },
          ],
        ],
      },
    ],
  };
};
