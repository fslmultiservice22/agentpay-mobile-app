import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /virtual-account senza generare, mostrare o condividere identificativi virtuali. */
export default function VirtualAccountScreen() {
  return <FinancialRouteGuard pathname="/virtual-account" />;
}
