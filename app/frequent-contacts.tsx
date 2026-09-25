import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /frequent-contacts senza analizzare contatti o proporre operazioni. */
export default function FrequentContactsScreen() {
  return <FinancialRouteGuard pathname="/frequent-contacts" />;
}
