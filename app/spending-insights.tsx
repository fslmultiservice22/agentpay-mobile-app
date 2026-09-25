import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /spending-insights senza suggerimenti basati su dati personali. */
export default function SpendingInsightsScreen() {
  return <FinancialRouteGuard pathname="/spending-insights" />;
}
