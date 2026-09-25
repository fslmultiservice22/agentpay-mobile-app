import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function TokenDistributionScreen() {
  return <FinancialRouteGuard pathname="/token-distribution" />;
}
