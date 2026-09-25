import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /emergency-fund senza calcoli, contributi, suggerimenti o archivi. */
export default function EmergencyFundScreen() {
  return <FinancialRouteGuard pathname="/emergency-fund" />;
}
