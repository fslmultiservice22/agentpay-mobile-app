import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /transfer-history senza caricare registri, filtri o esportazioni operative. */
export default function TransferHistoryScreen() {
  return <FinancialRouteGuard pathname="/transfer-history" />;
}
