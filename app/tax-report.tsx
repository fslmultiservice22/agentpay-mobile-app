import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /tax-report senza elaborazioni o documenti fiscali. */
export default function TaxReportScreen() {
  return <FinancialRouteGuard pathname="/tax-report" />;
}
