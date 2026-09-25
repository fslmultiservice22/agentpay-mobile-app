import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function WalletImportScreen() {
  return <FinancialRouteGuard pathname="/wallet-import" />;
}
