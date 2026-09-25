import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function LoyaltyPointsScreen() {
  return <FinancialRouteGuard pathname="/loyalty-points" />;
}
