import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../app/(tabs)/dashboard.tsx", import.meta.url), "utf8");

describe("dashboard technical status when the backend is unavailable", () => {
  it("clears the previous monitoring response after a failed request", () => {
    expect(source).toMatch(/catch\s*\{[^}]*setStatus\(null\);[^}]*setUnavailable\(true\);/s);
    expect(source).toContain('monitoring && !unavailable');
  });

  it("identifies connectivity as unverified without reporting financial operations as healthy", () => {
    expect(source).toContain("Il backend tecnico non è raggiungibile da questo dispositivo.");
    expect(source).toContain("Nessun controllo remoto confermato.");
    expect(source).toContain("nessun provider finanziario viene avviato.");
    expect(source).not.toContain("Nessun controllo tecnico è disponibile al momento.");
  });
});
