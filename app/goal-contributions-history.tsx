import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /goal-contributions-history senza storici, dati sintetici o grafici. */
export default function GoalContributionsHistoryScreen() {
  return <FinancialRouteGuard pathname="/goal-contributions-history" />;
}
