import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const serverBootstrap = readFileSync(
  new URL("../_core/index.ts", import.meta.url),
  "utf8",
);

describe("Codego provider boundary", () => {
  it("non registra /api/codego nel bootstrap del server", () => {
    // Il file server/routes/codego.ts resta archivio storico, ma non deve essere
    // importato o montato: Codego è chiuso e la beta non è transazionale.
    expect(serverBootstrap).not.toMatch(/routes\/codego/);
    expect(serverBootstrap).not.toMatch(/registerCodegoRoutes/);
    expect(serverBootstrap).not.toMatch(/\/api\/codego/);
  });
});
