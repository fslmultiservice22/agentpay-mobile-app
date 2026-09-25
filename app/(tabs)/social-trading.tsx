import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene la route /social-trading senza profili trader, copy trading o dati di mercato. */
export default function SocialTradingScreen() {
  return <FinancialRouteGuard pathname="/social-trading" />;
}
