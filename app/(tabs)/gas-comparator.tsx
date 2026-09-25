import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function GasComparatorScreen() {
  return <FinancialRouteGuard pathname="/gas-comparator" />;
}
