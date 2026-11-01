import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pilot = readFileSync(new URL("../app/local-expense-pilot.tsx", import.meta.url), "utf8");
const settings = readFileSync(new URL("../app/(tabs)/settings.tsx", import.meta.url), "utf8");
const syntheticPilot = readFileSync(new URL("../app/local-csv-pilot.tsx", import.meta.url), "utf8");
const gate = readFileSync(new URL("../lib/local-csv-pilot-gate.ts", import.meta.url), "utf8");

describe("hardening del percorso CSV reale", () => {
  it("rende sempre la route reale disabilitata e non contiene né importa un picker", () => {
    expect(pilot).toContain("Import CSV reale non disponibile");
    expect(pilot).toContain("revisione privacy non sarà approvata");
    expect(pilot).toContain("Nessun file viene");
    expect(pilot).toContain("aperto, letto, copiato o inviato.");
    expect(pilot).toContain("router.back()");
    expect(pilot).not.toContain("expo-document-picker");
    expect(pilot).not.toContain("DocumentPicker");
    expect(pilot).not.toContain("getDocumentAsync");
    expect(pilot).not.toContain("parseExpenseCsv");
  });

  it("non offre più un ingresso dalle impostazioni alla route reale", () => {
    expect(settings).not.toContain("/local-expense-pilot");
    expect(settings).not.toContain("Pilota CSV locale");
  });

  it("lascia invariati demo sintetica e gate dedicato", () => {
    expect(syntheticPilot).toContain("LOCAL_CSV_PILOT_ENABLED");
    expect(syntheticPilot).toContain("LOCAL_CSV_DEMO");
    expect(gate).toContain("localCsvPilotBuildAllowed");
    expect(gate).toContain("EXPO_PUBLIC_AGENTPAY_CSV_PILOT_PROFILE");
  });
});
