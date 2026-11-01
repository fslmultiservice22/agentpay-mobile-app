import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const screen = readFileSync(
  new URL("../app/monitor-log.tsx", import.meta.url),
  "utf8",
);
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

  it("mantiene disponibile il registro tecnico con ricerca e refresh read-only", () => {
    expect(screen).toContain("getMonitorHistory");
    expect(screen).toContain("useFocusEffect");
    expect(screen).toContain('placeholder="Cerca nel registro"');
    expect(screen).toContain("Aggiorna registro tecnico");
    expect(screen).toContain("filtered.map((entry)");
  });
});
