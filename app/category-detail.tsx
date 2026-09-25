import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /category-detail senza dati di spesa o dettagli di movimenti. */
export default function CategoryDetailScreen() {
  return <FinancialRouteGuard pathname="/category-detail" />;
}
