import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const screen = readFileSync(
  new URL("../app/monitor-log.tsx", import.meta.url),
  "utf8",
);
const home = readFileSync(new URL("../app/(tabs)/index.tsx", import.meta.url), "utf8");
const onboarding = readFileSync(new URL("../app/onboarding.tsx", import.meta.url), "utf8");
const csvGenerator = new URL("../lib/technical-log-csv.ts", import.meta.url);
const csvExporter = new URL("../lib/technical-log-export.ts", import.meta.url);

describe("percorso CSV escluso dal registro tecnico", () => {
  it("non espone preview/export, stato CSV o helper di creazione e condivisione file", () => {
    expect(screen).not.toMatch(
      /csv|previewCsv|openPreview|exportLocally|technical-log-(?:csv|export)|FileSystem|Sharing|Modal/i,
    );
    expect(existsSync(csvGenerator)).toBe(false);
    expect(existsSync(csvExporter)).toBe(false);
  });

  it("non promette più l’export del registro nella home o nell’onboarding", () => {
    expect(home).toContain("Ricerca e consultazione dello storico dei controlli tecnici.");
    expect(home).not.toContain("Esportazione locale del solo registro tecnico.");
    expect(onboarding).toContain("Registro tecnico");
    expect(onboarding).not.toMatch(/export\s+CSV|Export locale/i);
  });

  it("mantiene disponibile il registro tecnico con ricerca e refresh read-only", () => {
    expect(screen).toContain("getMonitorHistory");
    expect(screen).toContain("useFocusEffect");
    expect(screen).toContain('placeholder="Cerca nel registro"');
    expect(screen).toContain("Aggiorna registro tecnico");
    expect(screen).toContain("filtered.map((entry)");
  });
});
