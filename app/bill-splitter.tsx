import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function BillSplitterScreen() {
  return <FinancialRouteGuard pathname="/bill-splitter" />;
}
