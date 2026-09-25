import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function PdfReportsScreen() {
  return <FinancialRouteGuard pathname="/pdf-reports" />;
}
