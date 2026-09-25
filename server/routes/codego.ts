import { Router, type Express, type Request, type Response } from "express";

const CODEGO_DISABLED_RESPONSE = {
  success: false,
  provider: "codego",
  code: "provider_disabled",
  message: "Codego è disattivato per policy: nessuna carta, KYC, ricarica, saldo, transazione o webhook è disponibile.",
  enabled: false,
  networkRequestsAllowed: false,
  consentAllowed: false,
  safeguards: [
    "Nessuna richiesta viene inviata a Codego.",
    "Nessuna credenziale, carta, saldo o dato KYC viene elaborato.",
    "La riattivazione richiede revisione separata, credenziali ruotate e approvazione esplicita.",
  ],
} as const;

const router = Router();

router.use((_req: Request, res: Response) => {
  res.status(503).json(CODEGO_DISABLED_RESPONSE);
});

export function registerCodegoRoutes(app: Express) {
  app.use("/api/codego", router);
  console.log("[Codego] Route registrate in modalità inattiva per policy");
}

export default router;
