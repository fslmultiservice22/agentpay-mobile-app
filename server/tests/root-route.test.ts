import express from "express";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

import { registerRootRoute } from "../routes/root";

const servers: Array<ReturnType<ReturnType<typeof express>["listen"]>> = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

describe("root tecnica pubblica", () => {
  it("risponde 200 con il perimetro non transazionale", async () => {
    const app = express();
    registerRootRoute(app);

    const server = app.listen(0);
    servers.push(server);
    await new Promise<void>((resolve) => server.once("listening", resolve));

    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({
      service: "AgentPay Technical Beta API",
      status: "operational",
      mode: "non-transactional",
      financialServicesEnabled: false,
      publicSite: "https://agentpay.fslditta.com/",
      health: "/api/health",
    });
  });
});
