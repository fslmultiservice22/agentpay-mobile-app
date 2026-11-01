import { describe, expect, it } from "vitest";
import {
  isTrustedApiOrigin,
  PUBLISHED_API_BASE_URL,
  resolveApiBaseUrl,
  validateApiBaseUrl,
} from "../lib/api-base-url-policy";

describe("API base URL trust policy", () => {
  it("accepts only the exact published backend in non-development", () => {
    expect(validateApiBaseUrl(PUBLISHED_API_BASE_URL)).toBe(PUBLISHED_API_BASE_URL);
    expect(validateApiBaseUrl(`${PUBLISHED_API_BASE_URL}/`)).toBe(PUBLISHED_API_BASE_URL);
    for (const value of [
      "https://agentpayapp-q3spezws.manus.space.evil.example",
      "https://evil-agentpayapp-q3spezws.manus.space",
      "http://agentpayapp-q3spezws.manus.space",
      "https://agentpayapp-q3spezws.manus.space:443",
      "https://agentpayapp-q3spezws.manus.space/api",
      "https://agentpayapp-q3spezws.manus.space?x=1",
      "https://agentpayapp-q3spezws.manus.space#x",
      "https://user:pass@agentpayapp-q3spezws.manus.space",
      "https://3000-preview-demo.us1.manus.computer",
      "https://agentpayapp-q3spezws.manus.space.",
      "not a URL",
      "https://agentpayapp-q3spezws.manus.space@attacker.example",
    ]) {
      expect(validateApiBaseUrl(value)).toBeNull();
    }
  });

  it("allows only localhost and known preview hosts in explicit development", () => {
    expect(validateApiBaseUrl("http://localhost:3000", { isDevelopment: true })).toBe(
      "http://localhost:3000",
    );
    expect(validateApiBaseUrl("https://3000-ivlckbkfdrg4yww77jwdp-demo.us2.manus.computer", {
      isDevelopment: true,
    })).toBe("https://3000-ivlckbkfdrg4yww77jwdp-demo.us2.manus.computer");
    expect(
      validateApiBaseUrl("https://3000-preview-demo.us1.manus.computer", {
        isDevelopment: true,
      }),
    ).toBe("https://3000-preview-demo.us1.manus.computer");
    expect(
      validateApiBaseUrl("https://3000-preview-demo.us2.manus.computer/", {
        isDevelopment: true,
      }),
    ).toBe("https://3000-preview-demo.us2.manus.computer");
    for (const value of [
      "http://3000-preview-demo.us1.manus.computer",
      "https://3000-preview-demo.us3.manus.computer",
      "https://3000-preview-demo.us1.manus.computer.evil.example",
      "https://3000-preview-demo.us1.manus.computer:443",
      "https://3000-preview-demo.us1.manus.computer/path",
      "https://3000-preview-demo.us1.manus.computer?x=1",
      "https://3000-preview-demo.us1.manus.computer#x",
    ]) {
      expect(validateApiBaseUrl(value, { isDevelopment: true })).toBeNull();
    }
  });

  it("never returns an arbitrary configured host and gates relative fallback", () => {
    expect(() => resolveApiBaseUrl("https://attacker.example", { isDevelopment: true }))
      .toThrow("API base URL is not trusted");
    expect(resolveApiBaseUrl(undefined, { allowRelativeFallback: true })).toBe("");
    expect(resolveApiBaseUrl(undefined)).toBe(PUBLISHED_API_BASE_URL);
    expect(isTrustedApiOrigin(PUBLISHED_API_BASE_URL)).toBe(true);
    expect(isTrustedApiOrigin("https://attacker.example")).toBe(false);
  });
});
