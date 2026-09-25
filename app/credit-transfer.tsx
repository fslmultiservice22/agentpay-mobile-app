import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /credit-transfer senza richieste di credito, coda pagamenti o trasferimenti. */
export default function CreditTransferScreen() {
  return <FinancialRouteGuard pathname="/credit-transfer" />;
}
