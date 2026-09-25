import { Router, type Express, type Request, type Response } from "express";

import type { createTechnicalMonitor } from "../operational-monitor";

type TechnicalMonitor = ReturnType<typeof createTechnicalMonitor>;

const safeguards = [
  "Controlli tecnici read-only soltanto.",
  "Nessun pagamento, trasferimento, carta, saldo, wallet, firma, credenziale o provider finanziario.",
];

export function registerOperationalMonitorRoutes(app: Express, monitor: TechnicalMonitor) {
  const router = Router();

  router.get("/status", (_req: Request, res: Response) => {
    res.json({ success: true, monitoring: monitor.getLatest() ?? monitor.run(), safeguards });
  });

  router.get("/history", (_req: Request, res: Response) => {
    res.json({ success: true, entries: monitor.getHistory(), retention: "Memoria volatile del processo, massimo dodici controlli.", safeguards });
  });

  router.post("/refresh", (_req: Request, res: Response) => {
    res.json({ success: true, monitoring: monitor.run(), safeguards });
  });

  app.use("/api/operational-monitor", router);
}
