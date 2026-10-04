import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const apiSource = readFileSync(resolve(root, "lib/_core/api.ts"), "utf8");
const authSource = readFileSync(resolve(root, "lib/_core/auth.ts"), "utf8");
const gitignore = readFileSync(resolve(root, ".gitignore"), "utf8");

describe("sensitive logging safeguards", () => {
  it("does not log OAuth endpoints, error payloads, or session setup details", () => {
    const forbiddenApiMarkers = [
      "console.log(\"[API]",
      "[API] getMe failed:",
      "[API] establishSession: setting cookie on backend...",
      "[API] establishSession: cookie set successfully",
      "[API] establishSession error:",
    ];

    for (const marker of forbiddenApiMarkers) {
      expect(apiSource).not.toContain(marker);
    }
  });

  it("does not log session lifecycle or user profile contents", () => {
    const forbiddenAuthMarkers = [
      "console.log(\"[Auth]",
      "Removing session token...",
      "Session token removed from SecureStore successfully",
      "Getting user info...",
      "No user info found",
      "User info stored in localStorage successfully",
      "User info stored in SecureStore successfully",
      "Failed to get session token:",
      "Failed to get user info:",
      "Failed to set user info:",
    ];

    for (const marker of forbiddenAuthMarkers) {
      expect(authSource).not.toContain(marker);
    }
  });

  it("ignores local secret configuration while retaining safe examples", () => {
    expect(gitignore).toContain(".env");
    expect(gitignore).toContain(".env.*");
    expect(gitignore).toContain("!.env.example");
    expect(gitignore).toContain("!.env.*.example");
    expect(gitignore).toContain(".project-config.json");
  });
});
