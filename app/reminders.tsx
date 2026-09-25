import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Mantiene /reminders senza creare o gestire promemoria operativi. */
export default function RemindersScreen() {
  return <FinancialRouteGuard pathname="/reminders" />;
}
