import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("connection status indicator", () => {
  const source = readFileSync(new URL("../app/(tabs)/index.tsx", import.meta.url), "utf8");

  it("reports unavailable financial connectivity without declaring payments active", () => {
    expect(source).toContain("Connessione finanziaria non disponibile");
    expect(source).toContain("Provider esterni, pagamenti e consensi restano disattivati.");
    expect(source).not.toContain("Sistema di pagamento attivo e sicuro");
  });
});
