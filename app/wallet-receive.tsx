import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function WalletReceiveScreen() {
  return <FinancialRouteGuard pathname="/wallet-receive" />;
}
