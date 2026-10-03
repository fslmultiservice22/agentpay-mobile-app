import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isFinancialRouteBlocked } from "../lib/financial-route-policy";

const screen = readFileSync(
  resolve(process.cwd(), "app/local-expense-pilot.tsx"),
  "utf8",
);
const settings = readFileSync(
  resolve(process.cwd(), "app/(tabs)/settings.tsx"),
  "utf8",
);

describe("pilota CSV UI isolato", () => {
  it("è raggiungibile dalle Impostazioni senza togliere le guardie al Portafoglio", () => {
    expect(settings).toContain('router.push("/local-expense-pilot")');
    expect(isFinancialRouteBlocked("/portfolio")).toBe(true);
    expect(isFinancialRouteBlocked("/ob-connect")).toBe(true);
    expect(isFinancialRouteBlocked("/wallet-import")).toBe(true);
  });

  it("richiede una conferma esplicita per un CSV anonimo e limita la preview", () => {
    expect(screen).toContain(
      "Confermo che il CSV contiene solo dati fittizi o anonimizzati",
    );
    expect(screen).toContain("disabled={!confirmed || busy}");
    expect(screen).toContain("slice(0, previewLimit)");
    expect(screen).toContain("MAX_LOCAL_CSV_BYTES");
  });

  it("elimina soltanto la copia cache del picker e cancella lo stato in memoria", () => {
    expect(screen).toContain("asset.uri.startsWith(Paths.cache.uri)");
    expect(screen).toContain("new File(copiedUri).delete()");
    expect(screen).toContain("setResult(null)");
    expect(screen).toContain("URL.revokeObjectURL(blobUri)");
  });

  it("non importa moduli di rete o servizi finanziari", () => {
    expect(screen).not.toMatch(
      /\b(?:fetch\s*\(|axios|trpc|AsyncStorage|wallester|enable-banking|useBankAccounts)\b/i,
    );
    expect(screen).not.toContain("File.upload(");
  });
});
