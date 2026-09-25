import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /card-subscriptions senza abbonamenti, addebiti o gestione pagamenti. */
export default function CardSubscriptionsScreen() {
  return <FinancialRouteGuard pathname="/card-subscriptions" />;
}
