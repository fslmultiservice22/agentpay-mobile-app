import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /spending-forecast senza previsioni o elaborazioni personali. */
export default function SpendingForecastScreen() {
  return <FinancialRouteGuard pathname="/spending-forecast" />;
}
