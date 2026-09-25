import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /payment-queue senza visualizzare o processare code operative. */
export default function PaymentQueueScreen() {
  return <FinancialRouteGuard pathname="/payment-queue" />;
}
