import { describe, expect, it } from "vitest";

import {
  getDefaultIntegrationOptIn,
  grantIntegrationOptIn,
  isIntegrationOptedIn,
  revokeIntegrationOptIn,
} from "../lib/integration-opt-in";

describe("integration opt-in boundary", () => {
  it("keeps Telegram and Wallester disabled by default", () => {
    expect(getDefaultIntegrationOptIn()).toEqual({ telegram: false, wallester: false });
    expect(isIntegrationOptedIn(undefined, "telegram")).toBe(false);
    expect(isIntegrationOptedIn(undefined, "wallester")).toBe(false);
  });

  it("accepts only an explicit true opt-in", () => {
    expect(isIntegrationOptedIn({ telegram: 1 as unknown as boolean }, "telegram")).toBe(false);
    expect(isIntegrationOptedIn({ telegram: true }, "telegram")).toBe(true);
    expect(isIntegrationOptedIn({ wallester: true }, "wallester")).toBe(true);
  });

  it("changes local opt-in state without enabling network capability", () => {
    const granted = grantIntegrationOptIn(undefined, "telegram");
    expect(granted).toEqual({ telegram: true, wallester: false });

    const revoked = revokeIntegrationOptIn(granted, "telegram");
    expect(revoked).toEqual({ telegram: false, wallester: false });
  });
});
