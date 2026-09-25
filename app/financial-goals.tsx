import { FinancialRouteGuard } from "@/components/financial-route-guard";

/** Contratto legacy mantenuto per la sola compatibilità dei moduli non ancora isolati. */
export interface FinancialGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
  createdAt: number;
}

/** Mantiene /financial-goals senza obiettivi, progressi, contributi o promemoria. */
export default function FinancialGoalsScreen() {
  return <FinancialRouteGuard pathname="/financial-goals" />;
}
