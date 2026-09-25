import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Tipi di compatibilità: usati solo da schermate legacy che restano dietro guardia. */
export type RecurringFrequency = "weekly" | "biweekly" | "monthly";

export interface RecurringTemplate {
  id: string;
  accountId: string;
  amount: string;
  description: string;
  frequency: RecurringFrequency;
  reminderEnabled: boolean;
  nextReminderDate: number;
  createdAt: number;
  active: boolean;
}

/** Mantiene /recurring-transfer senza creare istruzioni o pianificazioni operative. */
export default function RecurringTransferScreen() {
  return <FinancialRouteGuard pathname="/recurring-transfer" />;
}
