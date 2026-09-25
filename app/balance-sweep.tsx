import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function BalanceSweepScreen() {
  return <FinancialRouteGuard pathname="/balance-sweep" />;
}
