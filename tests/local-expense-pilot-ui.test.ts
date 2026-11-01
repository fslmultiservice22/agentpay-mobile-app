import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isFinancialRouteBlocked } from "../lib/financial-route-policy";

const screen = readFileSync(
  resolve(process.cwd(), "app/local-expense-pilot.tsx"),
  "utf8",
);
describe("pilota CSV UI isolato", () => {
  it("rende esplicito che l'import CSV reale è disabilitato", () => {
    expect(screen).toContain("Import CSV reale non disponibile");
    expect(screen).toContain(
      "La selezione di file personali o di estratti conto è disabilitata",
    );
    expect(screen).toContain("revisione privacy non sarà approvata");
    expect(screen).toContain("Nessun file viene");
    expect(screen).toContain("aperto, letto, copiato o inviato.");
    expect(screen).toContain('accessibilityLabel="Torna alle impostazioni"');
    expect(screen).toContain("router.back()");
  });

  it("mantiene le guardie finanziarie e non effettua I/O", () => {
    expect(isFinancialRouteBlocked("/portfolio")).toBe(true);
    expect(isFinancialRouteBlocked("/ob-connect")).toBe(true);
    expect(isFinancialRouteBlocked("/wallet-import")).toBe(true);
    expect(screen).not.toMatch(
      /\b(?:fetch\s*\(|axios|trpc|AsyncStorage|wallester|enable-banking|useBankAccounts)\b/i,
    );
    expect(screen).not.toMatch(/expo-document-picker|DocumentPicker|getDocumentAsync/i);
    expect(screen).not.toContain("File.upload(");
  });
});
