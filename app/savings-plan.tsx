import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /savings-plan senza allocazioni, priorità o persistenza. */
export default function SavingsPlanScreen() {
  return <FinancialRouteGuard pathname="/savings-plan" />;
}
