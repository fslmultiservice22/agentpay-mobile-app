import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /balance-history senza elaborare dati o serie storiche. */
export default function BalanceHistoryScreen() {
  return <FinancialRouteGuard pathname="/balance-history" />;
}
