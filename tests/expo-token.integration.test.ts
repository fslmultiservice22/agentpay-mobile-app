import { describe, expect, it } from "vitest";

describe("Expo access token", () => {
  it.runIf(process.env.RUN_LIVE_INTEGRATION_TESTS === "1" && Boolean(process.env.EXPO_TOKEN))("autentica una richiesta account leggera senza avviare build", async () => {
    const token = process.env.EXPO_TOKEN;

    expect(token, "EXPO_TOKEN deve essere configurato nel pannello Secrets").toBeTruthy();

    const response = await fetch("https://api.expo.dev/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "query { me { id username } }" }),
    });

    expect(response.status, "Il token Expo deve essere valido per l’endpoint account").toBe(200);

    const payload = (await response.json()) as {
      data?: { me?: unknown };
      errors?: unknown[];
    };

    expect(payload.errors, "La richiesta GraphQL Expo non deve restituire errori").toBeUndefined();
    expect(payload.data?.me, "Il token Expo deve identificare un account").toBeTruthy();
  });
});
