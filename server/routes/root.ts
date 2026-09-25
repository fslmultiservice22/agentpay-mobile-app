import type { Express } from "express";

const PUBLIC_SITE_URL = "https://agentpay.fslditta.com/";

export function registerRootRoute(app: Express) {
  app.get("/", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      service: "AgentPay Technical Beta API",
      status: "operational",
      mode: "non-transactional",
      financialServicesEnabled: false,
      publicSite: PUBLIC_SITE_URL,
      health: "/api/health",
    });
  });
}
