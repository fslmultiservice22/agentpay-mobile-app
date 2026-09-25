import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function RecurringPaymentsScreen() {
  return <FinancialRouteGuard pathname="/recurring-payments" />;
}
