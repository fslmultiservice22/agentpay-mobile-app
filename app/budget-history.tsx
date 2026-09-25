import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Compatibilità per chiamanti legacy: non registra alcun dato. */
export async function appendThresholdLog(_value: number): Promise<void> {
  return;
}

/** Mantiene /budget-history senza consultare o confrontare archivi economici. */
export default function BudgetHistoryScreen() {
  return <FinancialRouteGuard pathname="/budget-history" />;
}
