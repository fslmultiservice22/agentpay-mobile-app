import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /subscription-budget senza budget, abbonamenti o notifiche. */
export default function SubscriptionBudgetScreen() {
  return <FinancialRouteGuard pathname="/subscription-budget" />;
}
