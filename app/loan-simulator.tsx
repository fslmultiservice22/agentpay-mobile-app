import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /loan-simulator senza preventivi, formule, piani o condivisioni. */
export default function LoanSimulatorScreen() {
  return <FinancialRouteGuard pathname="/loan-simulator" />;
}
