import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function AddToWalletScreen() {
  return <FinancialRouteGuard pathname="/add-to-wallet" />;
}
