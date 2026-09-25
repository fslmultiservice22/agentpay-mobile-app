import { Router, type Express, type Request, type Response } from "express";

import { getEnableBankingSandboxStatus } from "@/lib/enable-banking-sandbox-policy";

const safeguards = [
  "Il callback non legge né conserva parametri di autorizzazione.",
  "Nessun JWT viene firmato e nessuna chiamata viene inviata a Enable Banking.",
  "Consenso, conti, saldi e transazioni restano disattivati.",
];

function policyPayload() {
  return {
    success: false,
    accepted: false,
    status: getEnableBankingSandboxStatus(),
    safeguards,
  };
}

function disabledResponse(_req: Request, res: Response) {
  res.status(503).json(policyPayload());
}

export function registerEnableBankingRoutes(app: Express) {
  const router = Router();

  router.get("/status", (_req: Request, res: Response) => {
    res.json({ success: true, status: getEnableBankingSandboxStatus(), safeguards });
  });

  // L'URL esiste per la registrazione Sandbox, ma ignora intenzionalmente qualunque query
  // e non scambia codici, avvia consensi o chiama provider esterni.
  router.get("/callback", (_req: Request, res: Response) => {
    res.json(policyPayload());
  });

  router.all("*", disabledResponse);
  app.use("/api/open-banking", router);
}
