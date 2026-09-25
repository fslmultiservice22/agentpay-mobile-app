import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene la route /portfolio-dashboard senza caricare dati o grafici di portafoglio. */
export default function PortfolioDashboardScreen() {
  return <FinancialRouteGuard pathname="/portfolio-dashboard" />;
}
