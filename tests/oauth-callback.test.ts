import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const callbackSource = readFileSync(
  resolve(process.cwd(), "app/oauth/callback.tsx"),
  "utf8",
);
const appConfigSource = readFileSync(
  resolve(process.cwd(), "app.config.ts"),
  "utf8",
);

describe("OAuth callback hardening", () => {
  it("rejects a sessionToken-only callback instead of accepting it", () => {
    expect(callbackSource).not.toContain("params.sessionToken");
    expect(callbackSource).not.toContain("searchParams.get(\"sessionToken\")");
    expect(callbackSource).toContain("Ignore unknown query parameters, including sessionToken");
    expect(callbackSource).toContain('if (!code || !state)');
  });

  it("keeps authorization-code and state parameters for the server exchange", () => {
    expect(callbackSource).toContain('code: parsed.searchParams.get("code")');
    expect(callbackSource).toContain('state: parsed.searchParams.get("state")');
    expect(callbackSource).toContain("exchangeOAuthCode(code, state)");
    expect(callbackSource).toContain("consumePendingOAuthState(state)");
  });

  it("keeps the pending state on a failed exchange by consuming only afterward", () => {
    const validation = callbackSource.indexOf("hasPendingOAuthState(state)");
    const exchange = callbackSource.indexOf("Api.exchangeOAuthCode(code, state)");
    const consumption = callbackSource.indexOf("consumePendingOAuthState(state)");

    expect(validation).toBeGreaterThanOrEqual(0);
    expect(validation).toBeLessThan(exchange);
    expect(exchange).toBeLessThan(consumption);
  });

  it("narrows Android matching to agentpay://oauth/callback", () => {
    expect(appConfigSource).toContain('scheme: env.scheme');
    expect(appConfigSource).toContain('host: "oauth"');
    expect(appConfigSource).toContain('path: "/callback"');
    expect(appConfigSource).not.toContain('host: "*"');
  });
});
