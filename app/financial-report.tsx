import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /financial-report senza report, esportazioni o informazioni economiche. */
export default function FinancialReportScreen() {
  return <FinancialRouteGuard pathname="/financial-report" />;
}
