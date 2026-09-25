import express from "express";
import { afterEach, describe, expect, it } from "vitest";

import codegoRouter from "../routes/codego";

const servers: ReturnType<typeof express.application.listen>[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve())),
    ),
  );
});

describe("Codego provider policy", () => {
  it("blocca localmente le route senza effettuare chiamate esterne", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/codego", codegoRouter);

    const server = app.listen(0);
    servers.push(server);
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));

    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Porta di test non disponibile");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/codego/cards/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "non-usato" }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      provider: "codego",
      code: "provider_disabled",
      enabled: false,
      networkRequestsAllowed: false,
      consentAllowed: false,
    });
  });
});
