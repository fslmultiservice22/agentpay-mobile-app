import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function WalletExportScreen() {
  return <FinancialRouteGuard pathname="/wallet-export" />;
}
