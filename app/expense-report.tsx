import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /expense-report senza creare report o esportazioni. */
export default function ExpenseReportScreen() {
  return <FinancialRouteGuard pathname="/expense-report" />;
}
