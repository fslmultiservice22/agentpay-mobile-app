import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function WalletDetailScreen() {
  return <FinancialRouteGuard pathname="/wallet-detail" />;
}
