// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";

export default defineConfig([
  expoConfig,
  {
    ignores: ["dist/**"],
  },
  {
    rules: {
      "react/no-unescaped-entities": "warn",
      // SDK 56 enables the React Compiler lint suite for legacy screens. Keep
      // every finding visible while allowing the incremental SDK migration;
      // these rules remain tracked as pre-launch optimization debt.
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
    },
  },
]);
