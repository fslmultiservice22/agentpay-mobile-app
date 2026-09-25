import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function WlfiDashboardScreen() {
  return <FinancialRouteGuard pathname="/wlfi-dashboard" />;
}
