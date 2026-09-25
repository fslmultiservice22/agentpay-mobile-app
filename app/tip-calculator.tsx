import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function TipCalculatorScreen() {
  return <FinancialRouteGuard pathname="/tip-calculator" />;
}
