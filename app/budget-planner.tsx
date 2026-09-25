import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /budget-planner senza bilanci, allocazioni o persistenza. */
export default function BudgetPlannerScreen() {
  return <FinancialRouteGuard pathname="/budget-planner" />;
}
