import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /bank-accounts-manage senza leggere, modificare o rimuovere conti. */
export default function BankAccountsManageScreen() {
  return <FinancialRouteGuard pathname="/bank-accounts-manage" />;
}
