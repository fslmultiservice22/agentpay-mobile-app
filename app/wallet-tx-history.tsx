import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function WalletTxHistoryScreen() {
  return <FinancialRouteGuard pathname="/wallet-tx-history" />;
}
