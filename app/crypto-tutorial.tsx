import { FinancialRouteGuard } from "@/components/financial-route-guard";

export default function CryptoTutorialScreen() {
  return <FinancialRouteGuard pathname="/crypto-tutorial" />;
}
