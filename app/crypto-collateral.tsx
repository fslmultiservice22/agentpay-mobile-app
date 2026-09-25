import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function CryptoCollateralScreen() {
  return <FinancialRouteGuard pathname="/crypto-collateral" />;
}
