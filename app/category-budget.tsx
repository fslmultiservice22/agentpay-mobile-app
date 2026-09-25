import { FinancialRouteGuard } from "@/components/financial-route-guard";

export type BudgetMap = Record<string, number>;

/** Compatibilità per chiamanti legacy: non legge né conserva soglie o budget. */
export async function getBudgetsForAlert(): Promise<BudgetMap> {
  return {};
}

/** Mantiene /category-budget senza limiti, categorie o notifiche. */
export default function CategoryBudgetScreen() {
  return <FinancialRouteGuard pathname="/category-budget" />;
}
