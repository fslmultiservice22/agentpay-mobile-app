import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function WlfiMarketsScreen() {
  return <FinancialRouteGuard pathname="/wlfi-markets" />;
}
