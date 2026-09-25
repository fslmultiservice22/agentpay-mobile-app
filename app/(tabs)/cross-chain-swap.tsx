import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene la route /cross-chain-swap senza quotazioni, bridge, firme o provider. */
export default function CrossChainSwapScreen() {
  return <FinancialRouteGuard pathname="/cross-chain-swap" />;
}
