import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ENABLE_BANKING_CALLBACK_PATH,
  getEnableBankingSandboxStatus,
} from "../lib/enable-banking-sandbox-policy";

describe("Enable Banking Sandbox boundary", () => {
  it("espone un callback HTTPS server-side esclusivamente tecnico", () => {
    const status = getEnableBankingSandboxStatus();

    expect(ENABLE_BANKING_CALLBACK_PATH).toBe("/api/open-banking/callback");
    expect(status).toMatchObject({
      provider: "enable_banking",
      environment: "sandbox",
      enabled: false,
      networkRequestsAllowed: false,
      consentAllowed: false,
      registrationAllowed: false,
      publicCallbackJsonVerified: true,
    });
  });

  it("restituisce una copia difensiva dello stato Sandbox", () => {
    const first = getEnableBankingSandboxStatus();
    first.reason = "valore locale mutato";

    expect(getEnableBankingSandboxStatus().reason).not.toBe("valore locale mutato");
  });

  it("mantiene il callback nel namespace API Open Banking previsto", () => {
    const status = getEnableBankingSandboxStatus();

    expect(status.callbackPath).toBe(ENABLE_BANKING_CALLBACK_PATH);
    expect(status.callbackPath).toMatch(/^\/api\/open-banking\/callback$/);
  });

  it("mantiene bloccata la registrazione anche dopo la verifica del callback pubblico", () => {
    const status = getEnableBankingSandboxStatus();

    expect(status.registrationAllowed).toBe(false);
    expect(status.publicCallbackJsonVerified).toBe(true);
    expect(status.nextRequirement).toContain("autorizzazione separate");
  });

  it("espone una route di stato locale separata dal callback", () => {
    const source = readFileSync(new URL("../server/routes/enable-banking.ts", import.meta.url), "utf8");

    expect(source).toContain('router.get("/status"');
    expect(source).toContain('res.json({ success: true, status: getEnableBankingSandboxStatus(), safeguards })');
  });

  it("non contiene logica per chiavi, JWT o richieste al provider", () => {
    const source = readFileSync(new URL("../server/routes/enable-banking.ts", import.meta.url), "utf8");

    expect(source).toContain('router.get("/callback"');
    expect(source).toContain('router.all("*", disabledResponse)');
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/api\.enablebanking\.com/);
    expect(source).not.toMatch(/ENABLE_BANKING_PRIVATE_KEY/);
    expect(source).not.toMatch(/createSign/);
  });
});
