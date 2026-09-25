import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /spending-analysis senza analizzare dati economici. */
export default function SpendingAnalysisScreen() {
  return <FinancialRouteGuard pathname="/spending-analysis" />;
}
