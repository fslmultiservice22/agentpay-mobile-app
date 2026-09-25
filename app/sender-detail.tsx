import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /sender-detail senza dati di mittenti, grafici o promemoria. */
export default function SenderDetailScreen() {
  return <FinancialRouteGuard pathname="/sender-detail" />;
}
