import express from "express";
import { afterEach, describe, expect, it } from "vitest";

import { createAgentPayCorsMiddleware, isAllowedAgentPayOrigin } from "../cors-policy";

const servers: ReturnType<typeof express.application.listen>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function createTestServer() {
  const app = express();
  app.use(createAgentPayCorsMiddleware({ allowedOrigins: ["https://app.agentpay.example"] }));
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta di test non disponibile");
  return `http://127.0.0.1:${address.port}`;
}

describe("CORS AgentPay", () => {
  it("consente solo le origini esplicitamente autorizzate con credenziali", async () => {
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/api/health`, { headers: { Origin: "https://app.agentpay.example" } });

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://app.agentpay.example");
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    expect(response.headers.get("vary")).toContain("Origin");
  });

  it("rifiuta il preflight da origini non autorizzate", async () => {
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/api/health`, { method: "OPTIONS", headers: { Origin: "https://example.invalid" } });

    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("riconosce soltanto il formato delle preview Manus previsto", () => {
    expect(isAllowedAgentPayOrigin("https://8081-preview-a.us2.manus.computer", [])).toBe(true);
    expect(isAllowedAgentPayOrigin("https://8081-preview-a.us1.manus.computer", [])).toBe(true);
    expect(isAllowedAgentPayOrigin("https://other-preview-a.us2.manus.computer", [])).toBe(false);
    expect(isAllowedAgentPayOrigin("https://evil.us2.manus.computer", [])).toBe(false);
  });

  it("nega le preview quando la policy production le disabilita", () => {
    expect(isAllowedAgentPayOrigin("https://8081-preview-a.us1.manus.computer", [], false)).toBe(false);
  });
});
