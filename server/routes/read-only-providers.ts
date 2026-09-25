import { Router, type Express, type Request, type Response } from "express";

import { getReadOnlyProviderStatus, hasEnabledExternalProvider } from "@/lib/read-only-provider-policy";

const safeguards = [
  "Endpoint di stato locale: non effettua richieste a provider esterni.",
  "Nessun provider è abilitato nella Fase A.",
  "Nessun saldo, indirizzo, transazione, consenso o credenziale è restituito.",
];

export function registerReadOnlyProviderRoutes(app: Express) {
  const router = Router();

  router.get("/status", (_req: Request, res: Response) => {
    res.json({ success: true, providers: getReadOnlyProviderStatus(), enabled: hasEnabledExternalProvider(), safeguards });
  });

  app.use("/api/read-only-providers", router);
}
