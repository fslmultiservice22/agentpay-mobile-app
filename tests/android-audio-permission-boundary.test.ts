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

describe("confine permessi Android sensibili", () => {
  it("non include expo-audio e blocca microfono e overlay non necessari", () => {
    expect(packageJson.dependencies?.["expo-audio"]).toBeUndefined();
    expect(packageJson.devDependencies?.["expo-audio"]).toBeUndefined();
    expect(appConfig).not.toMatch(/['"]expo-audio['"]/);
    expect(appConfig).toMatch(
      /blockedPermissions:\s*\[[\s\S]*?android\.permission\.RECORD_AUDIO[\s\S]*?android\.permission\.SYSTEM_ALERT_WINDOW[\s\S]*?\]/,
    );
    expect(appConfig).toMatch(
      /["']expo-image-picker["'][\s\S]*?microphonePermission:\s*false/,
    );
  });
});
