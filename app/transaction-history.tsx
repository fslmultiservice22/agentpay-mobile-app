import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function TransactionHistoryScreen() {
  return <FinancialRouteGuard pathname="/transaction-history" />;
}
