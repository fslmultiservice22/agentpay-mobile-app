import Stripe from "stripe";

export type StripeClientConfig = {
  mode?: string;
  secretKey?: string;
};

export type StripeClientFactory = (secretKey: string) => Stripe;

// Stripe secret keys have a provider-specific suffix; this local format guard
// deliberately does not attempt to validate a key with Stripe's API.
const TEST_SECRET_KEY_PATTERN = /^(?:sk_test_|rk_test_)[A-Za-z0-9]{16,}$/;

function isAcceptedTestSecretKey(secretKey: unknown): secretKey is string {
  return typeof secretKey === "string" && TEST_SECRET_KEY_PATTERN.test(secretKey);
}

export function createStripeClient(
  config: StripeClientConfig = {
    mode: process.env.STRIPE_MODE,
    secretKey: process.env.STRIPE_SECRET_KEY,
  },
  factory: StripeClientFactory = (secretKey: string) => new Stripe(secretKey),
): Stripe | null {
  if (config.mode !== "test" || !isAcceptedTestSecretKey(config.secretKey)) {
    return null;
  }

  try {
    return factory(config.secretKey);
  } catch {
    // Do not leak credentials or provider/constructor errors into callers or logs.
    return null;
  }
}
