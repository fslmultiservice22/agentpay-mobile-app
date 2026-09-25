import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /income-stats senza calcolare statistiche personali. */
export default function IncomeStatsScreen() {
  return <FinancialRouteGuard pathname="/income-stats" />;
}
