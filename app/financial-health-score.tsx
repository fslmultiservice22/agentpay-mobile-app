import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /financial-health-score senza punteggi o valutazioni personali. */
export default function FinancialHealthScoreScreen() {
  return <FinancialRouteGuard pathname="/financial-health-score" />;
}
