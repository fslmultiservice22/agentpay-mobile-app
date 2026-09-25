import { describe, expect, it } from "vitest";

import { WALLesterMock } from "../lib/wallester-mock";

describe("Wallester mock boundary", () => {
  it("exposes only clearly labelled demonstrative values", () => {
    expect(WALLesterMock.accountLabel).toMatch(/^MOCK-/);
    expect(WALLesterMock.verification).toBe("Solo dimostrativa");
    expect(WALLesterMock.virtualCards).toBe("Nessuna carta reale");
    expect(WALLesterMock.creditLine).toBe("Non configurata");
  });

  it("does not expose network or activation methods", () => {
    expect(Object.keys(WALLesterMock)).not.toContain("fetch");
    expect(Object.keys(WALLesterMock)).not.toContain("activate");
    expect(Object.keys(WALLesterMock)).not.toContain("createCard");
  });
});
