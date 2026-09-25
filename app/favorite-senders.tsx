import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /favorite-senders senza dati personali o preferenze di mittenti. */
export default function FavoriteSendersScreen() {
  return <FinancialRouteGuard pathname="/favorite-senders" />;
}
