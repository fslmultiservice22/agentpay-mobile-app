import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /cash-flow-forecast senza previsioni o dati economici. */
export default function CashFlowForecastScreen() {
  return <FinancialRouteGuard pathname="/cash-flow-forecast" />;
}
