import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function ExpenseSplitScreen() {
  return <FinancialRouteGuard pathname="/expense-split" />;
}
