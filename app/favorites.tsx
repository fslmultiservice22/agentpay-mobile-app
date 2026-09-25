import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /favorites senza conservare o mostrare preferiti relativi a trasferimenti. */
export default function FavoritesScreen() {
  return <FinancialRouteGuard pathname="/favorites" />;
}
