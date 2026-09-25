import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /month-comparison senza confronti economici o dati simulati. */
export default function MonthComparisonScreen() {
  return <FinancialRouteGuard pathname="/month-comparison" />;
}
