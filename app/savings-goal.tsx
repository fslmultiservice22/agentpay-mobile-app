import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /savings-goal senza obiettivi, contributi, archivi o calcoli. */
export default function SavingsGoalScreen() {
  return <FinancialRouteGuard pathname="/savings-goal" />;
}
