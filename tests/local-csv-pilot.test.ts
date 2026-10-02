import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { LOCAL_CSV_DEMO } from "../lib/local-csv-demo";
import {
  MAX_CSV_BYTES,
  MAX_CSV_ROWS,
  parseLocalCsvStatement,
  summarizeLocalCsvMonths,
} from "../lib/local-csv-statement";

const root = resolve(__dirname, "..");
const header = "data;descrizione;importo;valuta";
const parserFixture = [
  header,
  '01/10/2026;"Demo acquisto; prova";-12,50;EUR',
  "02/10/2026;Demo accredito;1450,00;EUR",
  "02/10/2026;Demo accredito;1450,00;EUR",
  "30/09/2026;Demo settembre;-2,25;EUR",
].join("\r\n");

describe("pilota CSV — parser puro", () => {
  it("legge centesimi esatti, virgolette, BOM e preserva movimenti duplicati", () => {
    const result = parseLocalCsvStatement(`\uFEFF${parserFixture}`);
    expect(result.movements).toHaveLength(4);
    expect(result.movements[0]).toMatchObject({
      date: "2026-10-01", description: "Demo acquisto; prova", amountCents: -1250, currency: "EUR",
    });
    expect(result.movements[1].amountCents).toBe(145000);
    expect(result.movements[2].amountCents).toBe(145000);
    expect(summarizeLocalCsvMonths(result.movements)).toEqual([
      { month: "2026-10", incomeCents: 290000, expenseCents: 1250, count: 3 },
      { month: "2026-09", incomeCents: 0, expenseCents: 225, count: 1 },
    ]);
  });

  it("riconosce e riepiloga il solo esempio usato dalla schermata interna", () => {
    const file = readFileSync(resolve(root, "docs/local-csv-demo.csv"), "utf8");
    expect(file.trimEnd()).toBe(LOCAL_CSV_DEMO);
    const result = parseLocalCsvStatement(LOCAL_CSV_DEMO);
    expect(result.movements).toHaveLength(2);
    expect(summarizeLocalCsvMonths(result.movements)).toEqual([
      { month: "2026-10", incomeCents: 145000, expenseCents: 1250, count: 2 },
    ]);
  });

  it.each([
    ["CSV vuoto", "", "vuoto"],
    ["colonna aggiuntiva", `${header};iban\n01/10/2026;Demo;-1,00;EUR;DEMO`, "Colonne"],
    ["header duplicato", "data;descrizione;importo;importo\n01/10/2026;Demo;-1,00;EUR", "Colonne"],
    ["delimitatore non supportato", "data,descrizione,importo,valuta\n01/10/2026,Demo,-1.00,EUR", "Colonne"],
    ["valuta diversa", `${header}\n01/10/2026;Demo;-1,00;USD`, "Valuta"],
    ["giorno impossibile", `${header}\n31/02/2026;Demo;-1,00;EUR`, "Data"],
    ["giorno non bisestile", `${header}\n29/02/2025;Demo;-1,00;EUR`, "Data"],
    ["importo con punto", `${header}\n01/10/2026;Demo;-1.00;EUR`, "Importo"],
    ["importo extra large", `${header}\n01/10/2026;Demo;9999999999,00;EUR`, "Importo"],
    ["riga malformata", `${header}\n01/10/2026;Demo;-1,00`, "malformate"],
    ["descrizione vuota", `${header}\n01/10/2026; ;1,00;EUR`, "Descrizione"],
    ["sostituzione Unicode", `${header}\n01/10/2026;Repl\uFFFDce;-1,00;EUR`, "sostituzione"],
    ["virgolette non chiuse", `${header}\n01/10/2026;"Demo;-1,00;EUR`, "malformate"],
  ])("rifiuta %s con un errore senza contenuto del file", (_label, csv, message) => {
    expect(() => parseLocalCsvStatement(csv)).toThrowError(new RegExp(message));
  });

  it("applica limiti di dimensione e numero righe", () => {
    expect(() => parseLocalCsvStatement("X".repeat(MAX_CSV_BYTES + 1))).toThrow(/512 KiB/);
    const rows = Array.from({ length: MAX_CSV_ROWS + 1 }, () => "01/10/2026;Demo;-1,00;EUR");
    expect(() => parseLocalCsvStatement([header, ...rows].join("\n"))).toThrow(/2000/);
  });
});

describe("pilota CSV — solo esempio incorporato e profili spenti", () => {
  it("non offre un selettore né può leggere o copiare un estratto reale", () => {
    const screen = readFileSync(resolve(root, "app/local-csv-pilot.tsx"), "utf8");
    const demo = readFileSync(resolve(root, "lib/local-csv-demo.ts"), "utf8");
    const home = readFileSync(resolve(root, "app/(tabs)/index.tsx"), "utf8");
    expect(screen).toContain("setStatement(parseLocalCsvStatement(LOCAL_CSV_DEMO))");
    expect(screen).toContain('AppState.addEventListener("change"');
    expect(screen).toContain("setStatement(null)");
    expect(screen).toContain("if (!LOCAL_CSV_PILOT_ENABLED)");
    expect(home).toContain("{LOCAL_CSV_PILOT_ENABLED && (");
    expect(existsSync(resolve(root, "lib/local-csv-file.ts"))).toBe(false);
    for (const source of [screen, demo]) {
      expect(source).not.toMatch(/DocumentPicker|getDocumentAsync|expo-file-system|new File\(|\.text\(\)/);
      expect(source).not.toMatch(/\bfetch\s*\(|\bAsyncStorage\b|\baxios\b|\btrpc\b/);
    }
  });

  it("richiede il profilo EAS csv-pilot e disattiva esplicitamente tutti gli altri profili", () => {
    const gate = readFileSync(resolve(root, "lib/local-csv-pilot-gate.ts"), "utf8");
    const manifest = readFileSync(resolve(root, "app.config.ts"), "utf8");
    const preflight = readFileSync(resolve(root, "scripts/verify-eas-prelaunch.mjs"), "utf8");
    const eas = JSON.parse(readFileSync(resolve(root, "eas.json"), "utf8"));
    expect(manifest).toContain('process.env.EAS_BUILD_PROFILE === "csv-pilot"');
    expect(gate).toContain("Constants.expoConfig?.extra?.localCsvPilotBuildAllowed === true");
    expect(gate).toContain('process.env.EXPO_PUBLIC_AGENTPAY_CSV_PILOT === "enabled"');
    expect(gate).toContain('process.env.EXPO_PUBLIC_AGENTPAY_CSV_PILOT_PROFILE === "csv-pilot-internal"');
    for (const name of ["preview", "preview2", "preview3", "production-apk", "prelaunch", "production"]) {
      expect(eas.build[name].env).toEqual({
        EXPO_PUBLIC_AGENTPAY_CSV_PILOT: "disabled",
        EXPO_PUBLIC_AGENTPAY_CSV_PILOT_PROFILE: "ordinary",
      });
    }
    expect(eas.build["csv-pilot"]).toMatchObject({
      extends: "prelaunch",
      env: {
        EXPO_PUBLIC_AGENTPAY_CSV_PILOT: "enabled",
        EXPO_PUBLIC_AGENTPAY_CSV_PILOT_PROFILE: "csv-pilot-internal",
      },
    });
    expect(preflight).toContain('localCsvPilotBuildAllowed !== false');
    expect(readFileSync(resolve(root, "app/_layout.tsx"), "utf8")).toContain("shouldUseGlobalFinancialRouteGuard(pathname)");
  });
});
