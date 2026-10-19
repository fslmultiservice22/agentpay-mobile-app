import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const packageJson = JSON.parse(
  readFileSync(resolve(projectRoot, "package.json"), "utf8"),
) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const appConfig = readFileSync(resolve(projectRoot, "app.config.ts"), "utf8");

describe("confine permesso microfono Android", () => {
  it("non include expo-audio e blocca il microfono ereditato dal picker", () => {
    expect(packageJson.dependencies?.["expo-audio"]).toBeUndefined();
    expect(packageJson.devDependencies?.["expo-audio"]).toBeUndefined();
    expect(appConfig).not.toMatch(/['"]expo-audio['"]/);
    expect(appConfig).toContain(
      'blockedPermissions: ["android.permission.RECORD_AUDIO"]',
    );
    expect(appConfig).toMatch(
      /["']expo-image-picker["'][\s\S]*?microphonePermission:\s*false/,
    );
  });
});
