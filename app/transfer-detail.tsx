import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /transfer-detail senza dati, ricevute, promemoria o azioni operative. */
export default function TransferDetailScreen() {
  return <FinancialRouteGuard pathname="/transfer-detail" />;
}
