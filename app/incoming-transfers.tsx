import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /incoming-transfers senza registri, grafici o esportazioni di movimenti. */
export default function IncomingTransfersScreen() {
  return <FinancialRouteGuard pathname="/incoming-transfers" />;
}
