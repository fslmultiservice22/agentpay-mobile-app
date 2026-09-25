import { describe, expect, it } from "vitest";

import { getReadOnlyProviderStatus, hasEnabledExternalProvider } from "../lib/read-only-provider-policy";

describe("policy provider read-only", () => {
  it("mantiene ogni provider disattivato e senza richieste di rete", () => {
    const providers = getReadOnlyProviderStatus();
    expect(providers).toHaveLength(7);
    expect(providers.every((provider) => !provider.enabled && !provider.networkRequestsAllowed)).toBe(true);
    expect(hasEnabledExternalProvider()).toBe(false);
  });

  it("non approva provider che possono trattare dati bancari, carta o firma wallet", () => {
    const providers = getReadOnlyProviderStatus();
    for (const id of ["enable_banking", "codego", "walletconnect", "etherscan", "telegram", "wallester"]) {
      expect(providers.find((provider) => provider.id === id)?.decision).toBe("blocked");
    }
  });

  it("mantiene CoinGecko soltanto come candidato non attivo", () => {
    const coinGecko = getReadOnlyProviderStatus().find((provider) => provider.id === "coingecko");
    expect(coinGecko).toMatchObject({ decision: "candidate", enabled: false, networkRequestsAllowed: false });
  });
});
