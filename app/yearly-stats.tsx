import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /yearly-stats senza statistiche o aggregazioni annuali. */
export default function YearlyStatsScreen() {
  return <FinancialRouteGuard pathname="/yearly-stats" />;
}
