import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function PriceCompareScreen() {
  return <FinancialRouteGuard pathname="/price-compare" />;
}
