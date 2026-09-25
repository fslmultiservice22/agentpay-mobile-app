import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /net-worth-history senza aggregazioni di patrimonio o investimenti. */
export default function NetWorthHistoryScreen() {
  return <FinancialRouteGuard pathname="/net-worth-history" />;
}
