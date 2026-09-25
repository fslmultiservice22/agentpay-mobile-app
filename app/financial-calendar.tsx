import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /financial-calendar senza aggregare dati o eventi economici. */
export default function FinancialCalendarScreen() {
  return <FinancialRouteGuard pathname="/financial-calendar" />;
}
