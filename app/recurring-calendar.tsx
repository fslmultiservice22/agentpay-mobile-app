import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /recurring-calendar senza pianificare eventi o istruzioni ricorrenti. */
export default function RecurringCalendarScreen() {
  return <FinancialRouteGuard pathname="/recurring-calendar" />;
}
