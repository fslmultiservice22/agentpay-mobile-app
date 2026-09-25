import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Contratto legacy mantenuto senza limiti salvati o calcoli personali. */
export interface SpendingGoal {
  monthlyLimit: number;
  createdAt: number;
}

/** Compatibilità legacy: non legge alcun obiettivo. */
export async function getSpendingGoal(): Promise<SpendingGoal | null> {
  return null;
}

/** Compatibilità legacy: non conserva alcun obiettivo. */
export async function saveSpendingGoal(_goal: SpendingGoal): Promise<void> {
  return;
}

/** Compatibilità legacy: non modifica alcun archivio. */
export async function clearSpendingGoal(): Promise<void> {
  return;
}

/** Mantiene /spending-goal senza limiti, avvisi o statistiche. */
export default function SpendingGoalScreen() {
  return <FinancialRouteGuard pathname="/spending-goal" />;
}
