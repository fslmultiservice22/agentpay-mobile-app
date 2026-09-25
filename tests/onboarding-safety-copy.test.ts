import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const onboarding = readFileSync(new URL("../app/onboarding.tsx", import.meta.url), "utf8");

describe("Onboarding — comunicazione non transazionale", () => {
  it("non promette IBAN, bonifici o funzionalità finanziarie attive", () => {
    expect(onboarding).not.toMatch(/iban|bonific|pagamenti?\s+(?:attivi|disponibili|abilitati)|bonifici?\s+(?:attivi|disponibili|abilitati)/i);
  });

  it("dichiara che le funzioni finanziarie restano disattivate", () => {
    expect(onboarding).toContain("Le funzioni finanziarie restano disattivate.");
    expect(onboarding).toContain("Provider disattivati");
  });
});
