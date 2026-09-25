import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /debt-tracker senza debiti, crediti, interessi, rate o archivi. */
export default function DebtTrackerScreen() {
  return <FinancialRouteGuard pathname="/debt-tracker" />;
}
