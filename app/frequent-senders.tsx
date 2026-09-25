import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /frequent-senders senza analisi o classifiche di mittenti. */
export default function FrequentSendersScreen() {
  return <FinancialRouteGuard pathname="/frequent-senders" />;
}
