import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function TaxEstimatorScreen() {
  return <FinancialRouteGuard pathname="/tax-estimator" />;
}
