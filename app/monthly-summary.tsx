import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /monthly-summary senza registri, KPI o riepiloghi di movimenti. */
export default function MonthlySummaryScreen() {
  return <FinancialRouteGuard pathname="/monthly-summary" />;
}
