import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /savings-goals senza obiettivi, contributi, notifiche o dati personali. */
export default function SavingsGoalsScreen() {
  return <FinancialRouteGuard pathname="/savings-goals" />;
}
