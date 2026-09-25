import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("monitor technical status UI", () => {
  const source = readFileSync(new URL("../app/monitor-log.tsx", import.meta.url), "utf8");

  it("announces read-only technical status without payment processing copy", () => {
    expect(source).toContain("Aggiornamento tecnico in corso");
    expect(source).toContain("Nessun pagamento, consenso o provider esterno è stato avviato.");
    expect(source).not.toContain("Elaborazione pagamento");
  });

  it("rende ricerca e azioni locali esplicite alle tecnologie assistive", () => {
    expect(source).toContain('accessibilityRole="search"');
    expect(source).toContain("Filtra localmente le rilevazioni tecniche visualizzate");
    expect(source).toContain("Crea un file locale senza caricarlo a servizi esterni");
    expect(source).toContain('returnKeyType="search"');
  });
});
