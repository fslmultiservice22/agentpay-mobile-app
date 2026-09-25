import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /add-bank-account senza raccogliere dati identificativi di conto. */
export default function AddBankAccountScreen() {
  return <FinancialRouteGuard pathname="/add-bank-account" />;
}
