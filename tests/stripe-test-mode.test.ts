import type Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStripeClient } from "../server/stripe/client";

const validSecretKey = `sk_test_${"a".repeat(32)}`;
const validRestrictedKey = `rk_test_${"b".repeat(32)}`;
const fakeClient = { kind: "stub-stripe-client" } as unknown as Stripe;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("server Stripe test-mode client factory", () => {
  it("is disabled when the server environment has no Stripe settings", () => {
    vi.stubEnv("STRIPE_MODE", undefined);
    vi.stubEnv("STRIPE_SECRET_KEY", undefined);
    const factory = vi.fn(() => fakeClient);

    expect(createStripeClient(undefined, factory)).toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });

  it.each([
    { label: "missing mode", config: { secretKey: validSecretKey } },
    { label: "live mode", config: { mode: "live", secretKey: validSecretKey } },
    { label: "unknown mode", config: { mode: "preview", secretKey: validSecretKey } },
    { label: "missing key", config: { mode: "test" } },
    { label: "empty key", config: { mode: "test", secretKey: "" } },
    { label: "live secret key", config: { mode: "test", secretKey: `sk_live_${"c".repeat(32)}` } },
    { label: "publishable test key", config: { mode: "test", secretKey: `pk_test_${"d".repeat(32)}` } },
    { label: "prefix without a secret suffix", config: { mode: "test", secretKey: "sk_test_" } },
    { label: "malformed short secret", config: { mode: "test", secretKey: "sk_test_short" } },
    { label: "whitespace around key", config: { mode: "test", secretKey: ` ${validSecretKey}` } },
  ])("does not construct a client for $label", ({ config }) => {
    const factory = vi.fn(() => fakeClient);

    expect(createStripeClient(config, factory)).toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });

  it.each([
    { label: "standard test key", secretKey: validSecretKey },
    { label: "restricted test key", secretKey: validRestrictedKey },
  ])("constructs through the injected factory with a $label", ({ secretKey }) => {
    const factory = vi.fn(() => fakeClient);

    expect(createStripeClient({ mode: "test", secretKey }, factory)).toBe(fakeClient);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledWith(secretKey);
  });

  it("fails closed without returning or logging a constructor error", () => {
    const constructorError = new Error(`sensitive constructor detail: ${validSecretKey}`);
    const factory = vi.fn(() => {
      throw constructorError;
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      expect(
        createStripeClient({ mode: "test", secretKey: validSecretKey }, factory),
      ).toBeNull();
      expect(factory).toHaveBeenCalledTimes(1);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
