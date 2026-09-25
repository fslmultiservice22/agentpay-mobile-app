import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function SpendingReportScreen() {
  return <FinancialRouteGuard pathname="/spending-report" />;
}
