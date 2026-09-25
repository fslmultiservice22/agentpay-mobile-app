import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("tRPC Codego boundary", () => {
  it("does not expose any Codego procedure through the public tRPC router", () => {
    const routerSource = readFileSync(
      new URL("../server/routers.ts", import.meta.url),
      "utf8",
    );

    expect(routerSource).not.toMatch(/codegoRouter/);
    expect(routerSource).not.toMatch(/codego\s*:/);
  });
});
