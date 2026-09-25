import { describe, expect, it } from "vitest";

import { normalizeAgentPayStorageKey } from "../server/_core/storage-policy";

describe("AgentPay storage policy", () => {
  it("accepts only the AgentPay namespace", () => {
    expect(normalizeAgentPayStorageKey("agentpay/technical-log.csv")).toBe(
      "agentpay/technical-log.csv",
    );
  });

  it("rejects arbitrary and traversal storage keys", () => {
    expect(() => normalizeAgentPayStorageKey("other-project/private.pdf")).toThrow(
      "Storage key is not allowed",
    );
    expect(() => normalizeAgentPayStorageKey("agentpay/../secret.txt")).toThrow(
      "Storage key is not allowed",
    );
  });
});
