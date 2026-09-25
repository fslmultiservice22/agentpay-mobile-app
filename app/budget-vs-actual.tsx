import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /budget-vs-actual senza confronti o valori economici. */
export default function BudgetVsActualScreen() {
  return <FinancialRouteGuard pathname="/budget-vs-actual" />;
}
