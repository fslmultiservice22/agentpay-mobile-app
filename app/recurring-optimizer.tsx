import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /recurring-optimizer senza analisi, consigli o esportazioni. */
export default function RecurringOptimizerScreen() {
  return <FinancialRouteGuard pathname="/recurring-optimizer" />;
}
