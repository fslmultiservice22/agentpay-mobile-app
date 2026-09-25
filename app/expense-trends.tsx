import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /expense-trends senza trend, grafici o dati economici. */
export default function ExpenseTrendsScreen() {
  return <FinancialRouteGuard pathname="/expense-trends" />;
}
