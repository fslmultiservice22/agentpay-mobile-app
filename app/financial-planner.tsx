import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /financial-planner senza piani, calcoli, archivi, export o condivisioni. */
export default function FinancialPlannerScreen() {
  return <FinancialRouteGuard pathname="/financial-planner" />;
}
