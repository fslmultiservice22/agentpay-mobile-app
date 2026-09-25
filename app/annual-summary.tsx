import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /annual-summary senza aggregare dati economici o produrre riepiloghi. */
export default function AnnualSummaryScreen() {
  return <FinancialRouteGuard pathname="/annual-summary" />;
}
