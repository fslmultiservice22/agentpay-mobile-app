import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /(tabs)/credit-line senza plafond, richieste, rimborsi o collaterale. */
export default function CreditLineScreen() {
  return <FinancialRouteGuard pathname="/credit-line" />;
}
