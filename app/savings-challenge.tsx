import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /savings-challenge senza calcoli, contributi, progressi o archivi. */
export default function SavingsChallengeScreen() {
  return <FinancialRouteGuard pathname="/savings-challenge" />;
}
