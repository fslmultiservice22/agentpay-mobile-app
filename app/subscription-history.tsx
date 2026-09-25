import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function SubscriptionHistoryScreen() {
  return <FinancialRouteGuard pathname="/subscription-history" />;
}
