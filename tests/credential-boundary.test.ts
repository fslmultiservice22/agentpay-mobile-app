import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { getReadOnlyProviderStatus } from "../lib/read-only-provider-policy";

const easConfig = readFileSync(new URL("../eas.json", import.meta.url), "utf8");
const appConfig = readFileSync(new URL("../app.config.ts", import.meta.url), "utf8");
const prelaunchCheck = readFileSync(new URL("../scripts/verify-eas-prelaunch.mjs", import.meta.url), "utf8");
const gitignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
const oauthClient = readFileSync(new URL("../constants/oauth.ts", import.meta.url), "utf8");
const serverBootstrap = readFileSync(new URL("../server/_core/index.ts", import.meta.url), "utf8");
const bankingArchive = readFileSync(new URL("../docs/original/enable-banking-integration.md", import.meta.url), "utf8");
const apiClient = readFileSync(new URL("../lib/_core/api.ts", import.meta.url), "utf8");
const authClient = readFileSync(new URL("../lib/_core/auth.ts", import.meta.url), "utf8");
const oauthCallback = readFileSync(new URL("../app/oauth/callback.tsx", import.meta.url), "utf8");

describe("Credenziali — confine di configurazione", () => {
  it("non versiona valori o nomi di credenziali esterne nel file EAS", () => {
    expect(easConfig).not.toMatch(/ENABLE_BANKING_|CODEGO_|TELEGRAM_BOT_TOKEN|SENDGRID_API_KEY|JWT_SECRET/);
  });

  it("non mette chiavi private o token nel manifest Expo", () => {
    expect(appConfig).not.toMatch(/private.?key|api.?key|bot.?token/i);
  });

  it("ignora l'intera famiglia di file ambiente locali", () => {
    expect(gitignore).toMatch(/^\.env$/m);
    expect(gitignore).toMatch(/^\.env\.\*$/m);
    expect(gitignore).toMatch(/^!\.env\.example$/m);
  });

  it("mantiene ritirata la configurazione Open Banking storica", () => {
    expect(bankingArchive).not.toMatch(/Application ID|Institution ID|Private Key|ENABLE_BANKING_PRIVATE_KEY|api\.enablebanking\.com/i);
    expect(bankingArchive).toContain("enabled=false");
    expect(bankingArchive).toContain("networkRequestsAllowed=false");
  });

  it("non registra il proxy storage pubblico non usato e usa lo scheme reale", () => {
    expect(serverBootstrap).not.toContain("registerStorageProxy");
    expect(oauthClient).toContain('const schemeFromBundleId = "agentpay"');
    expect(oauthClient).toContain("/api/oauth/state");
    expect(oauthClient).not.toMatch(/\bbtoa\b/);
  });

  it("non stampa token, cookie, header risposta o oggetti utente nei log di autenticazione", () => {
    const authSources = `${apiClient}\n${authClient}\n${oauthCallback}`;
    expect(authSources).not.toMatch(
      /substring\(0,\s*(20|50)\)|Response headers|Set-Cookie header received|User info stored:|User data received:/,
    );
  });

  it("mantiene disattivati tutti i provider in attesa di una rotazione verificata", () => {
    expect(getReadOnlyProviderStatus().every((provider) => !provider.enabled && !provider.networkRequestsAllowed)).toBe(true);
  });

  it("mantiene il profilo prelaunch interno, standalone e senza submit", () => {
    const parsed = JSON.parse(easConfig);
    expect(parsed.cli).toMatchObject({ version: ">= 23.2.0", appVersionSource: "remote" });
    expect(parsed.build.prelaunch).toMatchObject({
      node: "22.14.0",
      environment: "preview",
      distribution: "internal",
      developmentClient: false,
      autoIncrement: true,
      android: { buildType: "apk", credentialsSource: "remote" },
    });
    expect(parsed.submit?.prelaunch).toBeUndefined();
    expect(prelaunchCheck).toContain("financialServicesEnabled: false");
    expect(prelaunchCheck).toContain("minimumRemoteVersionCode: 10235");
    expect(prelaunchCheck).toContain('"build:version:get"');
    expect(prelaunchCheck).toContain('"env:list"');
    expect(prelaunchCheck).toContain('"EXPO_PUBLIC_API_BASE_URL"');
    expect(prelaunchCheck).not.toMatch(/billing:subscribe|submit --platform|eas submit/);
  });
});
