import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const screen = readFileSync(new URL("../app/monitor-log.tsx", import.meta.url), "utf8");

describe("anteprima CSV del registro tecnico", () => {
  it("usa lo stesso generatore fail-closed dell'export senza creare file o aprire il foglio Condividi", () => {
    expect(screen).toContain('import { buildTechnicalLogCsv } from "@/lib/technical-log-csv"');
    expect(screen).toContain("setPreviewCsv(buildTechnicalLogCsv(entries))");
    expect(screen).toContain("onPress={openPreview}");
    expect(screen).toContain("Solo sul dispositivo. Nessun file è stato creato o condiviso da questa anteprima.");
    expect(screen).not.toContain("Sharing.shareAsync");
    expect(screen).not.toContain("FileSystem.writeAsStringAsync");
  });

  it("non mostra contenuto obsoleto durante un refresh e blocca l'anteprima con errore o dati assenti", () => {
    expect(screen).toContain("setPreviewCsv(null);\n    try {");
    expect(screen).toContain("if (loading || error || !entries.length) return;");
    expect(screen).toContain('disabled={loading || !!error || !entries.length} onPress={openPreview}');
    expect(screen).toContain("onRequestClose={() => setPreviewCsv(null)}");
  });
});
