import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /credit-card senza dati carta, limiti, blocchi o movimenti. */
export default function CreditCardScreen() {
  return <FinancialRouteGuard pathname="/credit-card" />;
}
