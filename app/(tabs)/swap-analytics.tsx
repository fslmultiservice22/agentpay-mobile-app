import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function SwapAnalyticsScreen() {
  return <FinancialRouteGuard pathname="/swap-analytics" />;
}
